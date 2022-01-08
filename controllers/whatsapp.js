const whatsapp = require('../utils/whatsapp')
const cache = require('../utils/cache')
const { CachedState, Message } = require('../utils/classes')
const { languages } = require('../utils/constants')
const { translateText, detectLanguage } = require('../utils/translator')
const storeModel = require('../models/store')
const { UserAlreadyExistsError } = require('../utils/errors')
const sendMessage = require('../utils/sendMessage')
const stt = require('../utils/stt')
let db = require('../utils/db')
const { ObjectId } = require('mongodb')
const Items = require('../models/Items')

const stateMessage = {
    '00001': 'preferredLanguageRequest',
    '00002': 'storeNameAndStoreNameRequest',
    '00003': 'storeNameAndRequestLocation',
    '00004': 'storeLocationAndRedirectUserToMenu',
    '00005': 'initiateRoutingAsPerNeed',
    '00006': 'receiveVoiceItem',
    '00007': 'receiveVoicePrice',
    '00008': 'processNewItemTemplate',
    '00010': 'listItems',
}

const handleTextMessage = async (message, contact, cachedData) => {
    try {
        let data = new CachedState(cachedData.number, cachedData.state, cachedData.data)
        let messageToSend = null
        let detectedLanguage = null
        if(message.text.body.toLowerCase() == 'clear') {
            await data.clearAllCache()
        } else {
            switch (data.state) {
                case '00002':
                    data.data.name = message.text.body
                    detectedLanguage = await detectLanguage(message.text.body)
                    if (detectedLanguage.language != languages.english) {
                        data.data.name = await translateText(message.text.body, languages.english)
                    }
                    data.state = '00003'
                    await data.cacheState()
                    messageToSend = new Message(
                        message.from,
                        'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                        'whats_your_store',
                        data.data.preferredLanguage,
                        [{
                            "type": "body",
                            "parameters": [
                                {
                                    "type": "text",
                                    "text": message.text.body
                                }
                            ]
                        }]
                    )
                    break
                case '00003':
                    data.data.storeName = message.text.body
                    detectedLanguage = await detectLanguage(message.text.body)
                    if (detectedLanguage.language != languages.english) {
                        data.data.storeName = await translateText(message.text.body, languages.english)
                    }
                    data.state = '00004'
                    await data.cacheState()
                    messageToSend = new Message(
                        message.from,
                        'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                        'location_request',
                        data.data.preferredLanguage,
                        [{
                            "type": "body",
                            "parameters": [
                                {
                                    "type": "text",
                                    "text": message.text.body
                                }
                            ]
                        }]
                    )
                    break
                case '00005':
                    switch(message.text.body) {
                        case '1':
                            data.state = '00006'
                            await data.cacheState()
                            messageToSend = new Message(
                                message.from,
                                'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                                'receive_voice_item',
                                data.data.preferredLanguage,
                                null
                            )
                            break
                        case '3':
                            data.state = '00010'
                            let storeItems = await db.getDB().collection('items').find({
                                store: data.data.storeId.toString()
                            }).toArray()
                            let pageNumber = data.data.pageNumber ? data.data.pageNumber : 1
                            let pageSize = parseInt(process.env.pageSize)
                            if(storeItems.length > 0) {
                                for (let i = pageSize * (pageNumber - 1); i < (storeItems.length <= pageSize ? storeItems.length : pageSize); i++) {
                                    let templateItem = await db.getDB().collection('templateItems').findOne({
                                        _id: ObjectId(storeItems[i].templateItemId)
                                    })
                                    await new Message(
                                        message.from,
                                        'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                                        'listing_item_detail',
                                        data.data.preferredLanguage,
                                        [{
                                            "type": "body",
                                            "parameters": [
                                                {
                                                    "type": "text",
                                                    "text": storeItems[i].templateItemId
                                                },
                                                {
                                                    "type": "text",
                                                    "text": templateItem.name
                                                },
                                                {
                                                    "type": "text",
                                                    "text": storeItems[i].price.toString()
                                                }
                                            ]
                                        }]
                                    ).send()
                                }
                                data.data.pageNumber = pageNumber + 1
                                await data.cacheState()
                            } else {
                                // todo := reply saying no items found
                                // messageToSend = new Message(
                                //     message.from,
                                //     'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                                // )
                                await data.clearAllCache()
                            }
                            break
                        default:
                            console.log("Not a valid option")
                    }
                    break
                default:
                    let storedStore = await storeModel.getStoreUsingKeyAndValue(
                        'mobile',
                        message.from
                    )
                    if(storedStore != null) {
                        let newCache = new CachedState(
                            message.from,
                            '00005',
                            {
                                preferredLanguage: storedStore.preferredLanguage,
                                storeId: storedStore._id.toString(),
                                name: storedStore.name,
                                storeName: storedStore.storeName,
                                storeLocation: storedStore.storeLocation
                            })
                        await newCache.cacheState()
                        await new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'welcome_back_message',
                            newCache.data.preferredLanguage,
                            [{
                                "type": "body",
                                "parameters": [
                                    {
                                        "type": "text",
                                        "text": newCache.data.name
                                    }
                                ]
                            }]
                        ).send()
                        messageToSend = new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'patti_menu',
                            storedStore.preferredLanguage,
                            null
                        )
                        console.log('**ccd')
                    } else {
                        messageToSend = new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'welcome_to_patti2',
                            'en',
                            null
                        )
                        let newCache = new CachedState(message.from, '00001', {})
                        await newCache.cacheState()
                    }
                    
            }
            if (messageToSend != null) {
                messageToSend.send()
            }
        }
    } catch (err) {
        throw err
    }
}

const handleButtonMessage = async (message, contact, cachedData) => {
    try {
        let data = new CachedState(cachedData.number, cachedData.state, cachedData.data)
        let messageToSend = null
        let exitString = 'exit'
        if(cachedData.data.preferredLanguage != languages.english) {
            exitString = await translateText(message.button.text, languages.english)
        }
        if (exitString.toLowerCase() == 'exit') {
            await data.clearAllCache()
        } else {}
        switch(data.state) {
            case '00001':
                data.data = {}
                switch(message.button.text) {
                    case 'Kannada':
                        data.data.preferredLanguage = languages.kannada
                        break
                    case 'English':
                        data.data.preferredLanguage = languages.english
                        break
                }
                data.state = '00002'
                data.cacheState()
                let languageString = "English"
                if (data.data.preferredLanguage != languages.english) {
                    languageString = await translateText(message.button.text, data.data.preferredLanguage)
                }
                messageToSend = new Message(
                    message.from,
                    'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                    'whats_your_name',
                    data.data.preferredLanguage,
                    [{
                        "type": "body",
                        "parameters": [
                            {
                                "type": "text",
                                "text": languageString
                            }
                        ]
                    }]
                )
                break
        }
        if (messageToSend != null) {
            messageToSend.send()
        }
    } catch (err) {
        throw err
    }
}

const handleLocationMessage = async (message, contact, cachedData) => {
    try {
        let data = new CachedState(cachedData.number, cachedData.state, cachedData.data)
        let messageToSend = null
        switch(data.state) {
            case '00004':
                console.log('******Location received******')
                data.data.storeLocation = `${message.location.latitude}, ${message.location.longitude}`
                data.state = '00005'
                await data.cacheState()
                messageToSend = new Message(
                    message.from,
                    'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                    'patti_menu',
                    data.data.preferredLanguage,
                    null
                )
                try {
                    await storeModel.addStore({
                        name: data.data.name,
                        storeName: data.data.storeName,
                        mobile: data.number,
                        location: data.data.storeLocation,
                        preferredLanguage: data.data.preferredLanguage
                    })
                } catch (err) {
                    if(err instanceof UserAlreadyExistsError) {
                        console.log('User already exists')
                    } else {
                        console.log(err)
                    }
                }
                break
        }
        if (messageToSend != null) {
            messageToSend.send()
        }
    } catch (err) {
        throw err
    }
}

const handleMediaMessage = async (message, contact, cachedData) => {
    try {
        let data = new CachedState(cachedData.number, cachedData.state, cachedData.data)
        let messageToSend = null
        let detectedLanguage = null
        switch(data.state) {
            case '00006':
                let transcription = await stt.convertToText(data.data.filepath)
                let emptyMessage = new Message(
                    message.from,
                    'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                    'item_unidentified',
                    data.data.preferredLanguage,
                    null
                )
                if(transcription) {
                    if (transcription.length > 0 && transcription[0] != '') {
                        let detectedStrings = transcription.split(',')
                        let andQueries = detectedStrings.map(dtstr => {
                            return {
                                name: {
                                    $regex: `.*${dtstr}.*`,
                                    $options: 'i'
                                }
                            }
                        })
                        console.log(andQueries)
                        let matches = await db.getDB().collection('templateItems').findOne({
                            $or: andQueries
                        })
                        if(matches != undefined && matches != null) {
                            data.data.selectedItem = matches._id
                            data.state = '00007'
                            await data.cacheState()
                            messageToSend = new Message(
                                message.from,
                                'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                                'price_voicenote',
                                data.data.preferredLanguage,
                                null
                            )
                        }
                        else {
                            data.state = '00008'
                            await data.cacheState()
                            emptyMessage.send()
                        }
                    } else {
                        data.state = '00008'
                        await data.cacheState()
                        emptyMessage.send()
                    }
                } else {
                    data.state = '00008'
                    await data.cacheState()
                    emptyMessage.send()
                }
                // console.log(matches)
                break
            case '00007':
                let detectedWords = await stt.convertToText(data.data.filepath)
                if(detectedWords) {
                    let price = parseInt(detectedWords)
                    if(!isNaN(price)) {
                        data.data.price = price
                        data.state = '00009'
                        await data.cacheState()
                        let templateItem = await db.getDB().collection('templateItems').findOne({
                            _id: ObjectId(data.data.selectedItem)
                        })
                        if(!templateItem.prices.includes(price)){
                            templateItem.prices.push(price)
                            delete templateItem._id
                            await db.getDB().collection('templateItems').updateOne({
                                _id: ObjectId(data.data.selectedItem)
                            }, {
                                $set: {
                                    prices: templateItem.prices
                                }
                            })
                        }
                        let newItem = new Items(
                            data.data.selectedItem,
                            data.data.storeId,
                            price,
                            12,
                            data.data.filekey
                        )
                        await newItem.save()
                        messageToSend = new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'add_sucess',
                            data.data.preferredLanguage,
                            [{
                                "type": "body",
                                "parameters": [
                                    {
                                        "type": "text",
                                        "text": `${templateItem.name}`
                                    }
                                ]
                            }]
                        )
                    } else {
                        data.state = '00008'
                        await data.cacheState()
                        messageToSend = new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'item_unidentified',
                            data.data.preferredLanguage,
                            null
                        )
                    }
                } else {
                    data.state = '00008'
                    await data.cacheState()
                    messageToSend = new Message(
                        message.from,
                        'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                        'item_unidentified',
                        data.data.preferredLanguage,
                        null
                    )
                }
                break
            default:
                console.log('Error')
        }
        if(messageToSend != null) {
            messageToSend.send()
        }
    } catch (err) {
        throw err
    }
}

module.exports = {
    handleTextMessage,
    handleButtonMessage,
    handleLocationMessage,
    handleMediaMessage
}