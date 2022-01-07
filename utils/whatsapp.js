const axios = require('axios').default
const cache = require('./cache')

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
            // let config = {
            //     method: 'POST',
            //     url: `${process.env.WHATSAPP_URL}/v1/users/login`,
            //     headers: {
            //         'Authorization': `Basic ${authHeaderBase64}`,
            //         'Content-Type': 'application/json'
            //     },
            // }
            // axios(config).then((response) => {
            //     cache.cacheKeyValue(cache.cacheConstants.whatsappToken, response.data.users[0].token)
            //     token = response.data.users[0].token
            // }).catch((err) => {
            //     throw err
            // })
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
        console.log('Whatsapp message received!')
        messageModel.addMessage(req.body)
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

module.exports = {
    authenticateWithWhatsapp,
    setWhatsappWebhook,
    listenToWhatsapp
}