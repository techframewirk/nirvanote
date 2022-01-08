const axios = require('axios').default
const cache = require('./cache')
let fs = require('fs')
let request = require('request')
const { CachedState } = require('../utils/classes')
const { handleTextMessage, handleButtonMessage, handleLocationMessage, handleMediaMessage } = require('../controllers/whatsapp')
const s3 = require('../utils/s3')

const messageModel = require('../models/messages')

let token = null

const authenticateWithWhatsapp = async () => {
    try {
        let cachedToken = await cache.getValueFromCache(cache.cacheConstants.whatsappToken)
        if (cachedToken) {
            token = cachedToken
        } else {
            let authHeader = `${process.env.WHATSAPP_ADMIN_USERNAME}:${process.env.WHATSAPP_ADMIN_PASSWORD}`
            let authHeaderBase64 = Buffer.from(authHeader).toString('base64')
            let response = await axios.post(`${process.env.WHATSAPP_URL}/v1/users/login`, {}, {
                headers: {
                    'Authorization': `Basic ${authHeaderBase64}`,
                    'Content-Type': 'application/json'
                }
            })
            if(response.status == 200) {
                await cache.cacheKeyValue(cache.cacheConstants.whatsappToken, response.data.users[0].token)
                token = response.data.users[0].token
            }
        }
    } catch (err) {
        throw err
    }
}

const setWhatsappWebhook = async () => {
    try {
        let response = await axios.patch(`${process.env.WHATSAPP_URL}/v1/settings/application`, {
            "webhooks": {
                "url": `${process.env.HOST}/webhook/whatsapp/${process.env.WHATSAPP_WEBHOOK_SECRET}`
            }
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        if(response.status === 200) {
            console.log('Webhook Set successfully!')
        }
    } catch (err) {
        throw err
    }
}

const listenToWhatsapp = async (req, res) => {
    try {
        let messageData = req.body
        console.log(messageData)
        if (messageData.messages) {
            for (let i = 0; i < messageData.messages.length; i++) {
                let contact = messageData.contacts[i]
                let message = messageData.messages[i]
                messageModel.addMessage({
                    type: 'received',
                    with: message.from,
                    message: message,
                    timestamp: new Date()
                })
                let cachedData = await new CachedState(message.from).getStateFromCache()
                switch(message.type) {
                    case 'text':
                        handleTextMessage(message, contact, cachedData)
                        break
                    case 'image':
                        let path = await downloadMedia(message)
                        console.log(path)
                        console.log('Image received')
                        break
                    case 'voice':
                        let { filepath, filename } = await downloadMedia(message)
                        let filekey = await s3.pushFileToS3(filename, filepath)
                        let tempCache = new CachedState(cachedData.number, cachedData.state, cachedData.data)
                        tempCache.data.filekey = filekey
                        tempCache.data.filename = filename
                        tempCache.data.filepath = filepath
                        await tempCache.cacheState()
                        handleMediaMessage(message, contact, tempCache)
                        break
                    case 'location':
                        handleLocationMessage(message, contact, cachedData)
                        break
                    case 'button':
                        handleButtonMessage(message, contact, cachedData)
                        break   
                }
            }
        }
        res.status(200).json({
            status: 'ok'
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({
            status: 'error'
        })
    }
}

const downloadMedia = async (message) => {
    try {
        let path = null
        return new Promise((resolve, reject) => {
            request.head(`${process.env.WHATSAPP_URL}/v1/media/${message[message.type].id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }, (err, res, body) => {
                if (err) {
                    reject(err)
                } else {
                    path = `./media/${message[message.type].id}.${res.headers['content-type'].split('/')[1].split(';')[0]}`
                    request(`${process.env.WHATSAPP_URL}/v1/media/${message[message.type].id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }).pipe(fs.createWriteStream(`./media/${message[message.type].id}.${res.headers['content-type'].split('/')[1].split(';')[0]}`))
                        .on('close', () => {
                            // console.log('write done')
                            // const base64data = fs.readFileSync(path, { encoding: 'base64' })
                            // fs.writeFileSync(`./media/${message[message.type].id}.mp3`, Buffer.from(base64data.replace('data:audio/ogg; codecs=opus;base64,', ''), 'base64'));
                            // fs.unlinkSync(path)
                            resolve({
                                filepath: path,
                                filename: `${message[message.type].id}.${res.headers['content-type'].split('/')[1].split(';')[0]}`
                            })
                        })
                }
            })
        })
    } catch (err) {
        throw err
    }
}

// const sendMessage = async (message) => {
//     try {
//         let response = await axios.post(`${process.env.WHATSAPP_URL}/v1/messages`, message, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         })
//         if(response.status === 200) {
//             console.log('Message sent successfully!')
//         }
//     } catch (err) {
//         throw err
//     }
// }

const getToken = async () => {
    try {
        if(token == null) {
            throw new Error('Token not found')
        } else {
            return token
        }
    } catch (err) {
        console.log(err)
    }
}

module.exports = {
    authenticateWithWhatsapp,
    setWhatsappWebhook,
    listenToWhatsapp,
    getToken
}