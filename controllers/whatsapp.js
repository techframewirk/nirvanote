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
const TemplateItem = require('../models/TemplateItem')

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
    '00011': 'updatePrice',
    '00012': 'deleteItem',
    '00014': 'priceForItemTemplate',
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
                    // todo := change template when approved
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
                        case '2':
                            data.state = '00010'
                            await data.cacheState()
                            await new Message(
                                message.from,
                                'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                                'update_message',
                                data.data.preferredLanguage,
                                null
                            ).send()
                            data.data.operation = 'update'
                            await data.cacheState()
                            // Intentional fall through
                        case '4':
                            if(data.data.operation != 'update') {
                                data.state = '00010'
                                data.data.operation = 'delete'
                                await data.cacheState()
                                await new Message(
                                    message.from,
                                    'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                                    'delete_message_init',
                                    data.data.preferredLanguage,
                                    null
                                )
                            }
                            // Intentional fall through
                        case '3':
                            data.state = '00010'
                            let storeItems = await db.getDB().collection('items').find({
                                store: data.data.storeId.toString()
                            }).toArray()
                            let pageNumber = data.data.pageNumber ? data.data.pageNumber : 1
                            let pageSize = parseInt(process.env.pageSize)
                            if(storeItems.length > 0) {
                                let messageItemMap = data.data.messageItemMap ? data.data.messageItemMap : {}
                                for (let i = pageSize * (pageNumber - 1); i < (storeItems.length <= pageSize ? storeItems.length : pageSize); i++) {
                                    let templateItem = await db.getDB().collection('templateItems').findOne({
                                        _id: ObjectId(storeItems[i].templateItemId)
                                    })
                                    let messageId = await new Message(
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
                                    messageItemMap[messageId] = storeItems[i]._id.toString()
                                }
                                data.data.pageNumber = pageNumber + 1
                                data.data.messageItemMap = messageItemMap
                                await data.cacheState()
                            } else {
                                messageToSend = new Message(
                                    message.from,
                                    'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                                    'empty_items_template',
                                    data.data.preferredLanguage,
                                    null
                                )
                                await data.clearAllCache()
                            }
                            break
                        default:
                            console.log("Not a valid option")
                    }
                    break
                case '00011':
                    let updatedPrice = parseInt(message.text.body)
                    if(!isNaN(updatedPrice)) {
                        await db.getDB().collection('items').updateOne({
                            _id: ObjectId(data.data.toUpdateItemId)
                        }, {
                            $set: {
                                price: updatedPrice
                            }
                        })
                        await new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'update_success',
                            data.data.preferredLanguage,
                            null
                        ).send()
                        messageToSend = new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'patti_menu',
                            data.data.preferredLanguage,
                            null
                        )
                        data.state = '00005'
                        await data.cacheState()
                    }
                    break
                case '00008':
                    data.state = '00014'
                    let [ templateItemName, templateItemDescription ] = message.text.body.split(',')
                    if(templateItemName && templateItemDescription) {
                        let resultMax = await db.getDB().collection('templateItems').find().sort({ numId: -1 }).limit(1).toArray()
                        let newProductId = null
                        if(resultMax != undefined && resultMax != null) {
                            if(resultMax.length == 1 ) {
                                let lastProduct = resultMax[0].numId
                                newProductId = lastProduct + 1
                            } else {
                                newProductId = 1
                            }
                        } else {
                            newProductId = 1
                        }
                        let newProd = new TemplateItem(
                            newProductId,
                            templateItemName,
                            templateItemDescription,
                            null, 
                            null, 
                            null
                        )
                        data.data.newTemplateItem = newProd
                        await data.cacheState()
                        messageToSend = new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'price_voicenote',
                            data.data.preferredLanguage,
                            null
                            // [{
                            //     "type": "body",
                            //     "parameters": [
                            //         {
                            //             "type": "text",
                            //             "text": templateItemName
                            //         }]
                            // }]
                        )
                    }
                    break
                // case '00014':
                //     let updatedPriceTemplate = parseInt(message.text.body)
                //     if(!isNaN(updatedPriceTemplate)) {
                //         let newProd = new TemplateItem(
                //             data.data.newTemplateItem.numId,
                //             data.data.newTemplateItem.name,
                //             data.data.newTemplateItem.description,
                //             [updatedPriceTemplate]
                //         )
                //         let prodSaved = await newProd.save()
                //         if(prodSaved) {
                //             await new Items(
                //                 prodSaved.insertedId.toString(),
                //                 data.data.storeId,
                //                 updatedPriceTemplate,
                //                 12,
                //                 data.data.filekey
                //             ).save()
                //             messageToSend = new Message(
                //                 message.from,
                //                 'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                //                 'update_success',
                //                 data.data.preferredLanguage,
                //                 null
                //             )
                //             await data.clearAllCache()
                //         }
                //     }
                //     break
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
                            'welcome_to_nirvanote',
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
        if (data.state == '00005' && exitString.toLowerCase() == 'exit') {
            await data.clearAllCache()
            messageToSend = new Message(
                message.from,
                'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                'exit_message',
                data.data.preferredLanguage,
                null
            )
        } else {
            switch (data.state) {
                case '00001':
                    data.data = {}
                    switch (message.button.text) {
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
                case '00010':
                    let messageId = message.context.id
                    let itemDocId = data.data.messageItemMap[messageId]
                    let itemDocument = await db.getDB().collection('items').findOne({
                        _id: ObjectId(itemDocId)
                    })
                    let templateDocument = await db.getDB().collection('templateItems').findOne({
                        _id: ObjectId(itemDocument.templateItemId)
                    })
                    if (data.data.operation == 'update' && itemDocument != null) {
                        await new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'update_price_template',
                            data.data.preferredLanguage,
                            [{
                                "type": "body",
                                "parameters": [
                                    {
                                        "type": "text",
                                        "text": templateDocument.name
                                    }]
                            }]
                        ).send()
                        data.state = '00011'
                        data.data.toUpdateItemId = itemDocument._id.toString()
                        await data.cacheState()
                    } else if (data.data.operation == 'delete' && itemDocument != null) {
                        await new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'delete_confirmation',
                            data.data.preferredLanguage,
                            [{
                                "type": "body",
                                "parameters": [
                                    {
                                        "type": "text",
                                        "text": templateDocument.name
                                    }]
                            }]
                        ).send()
                        data.state = '00012'
                        data.data.toDeleteItemId = itemDocument._id.toString()
                        await data.cacheState()
                    }
                    break
                case '00012':
                    await db.getDB().collection('items').deleteOne({
                        _id: ObjectId(data.data.toDeleteItemId)
                    })
                    await new Message(
                        message.from,
                        'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                        'delete_success',
                        data.data.preferredLanguage,
                        null
                    ).send()
                    messageToSend = new Message(
                        message.from,
                        'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                        'patti_menu',
                        data.data.preferredLanguage,
                        null
                    )
                    data.state = '00005'
                    await data.cacheState()
                    // data.clearAllCache()
                    break
                default:
                    // let messageId = message.context.id
                    // console.log(messageId)
                    // console.log(data.data.messageItemMap)
                    // let itemDocId = data.data.messageItemMap[messageId]
                    // let itemDocument = await db.getDB().collection('items').findOne({
                    //     _id: ObjectId(itemDocId)
                    // })
                    console.log('Error in Button')
            }
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
                break
            case '00007':
                let detectedWords = await stt.convertToText(data.data.filepath)
                if(detectedWords) {
                    let price = parseInt(detectedWords)
                    if(!isNaN(price)) {
                        data.data.price = price
                        data.state = '00005'
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
                        await new Message(
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
                        ).send()
                        messageToSend = new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'patti_menu',
                            data.data.preferredLanguage,
                            null
                        )
                    } else {
                        data.state = '00007'
                        await data.cacheState()
                        messageToSend = new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'try_again_template',
                            data.data.preferredLanguage,
                            null
                        )
                    }
                } else {
                    data.state = '00007'
                    await data.cacheState()
                    messageToSend = new Message(
                        message.from,
                        'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                        'try_again_template',
                        data.data.preferredLanguage,
                        null
                    )
                }
                break
            case '00014':
                let detectedWords2 = await stt.convertToText(data.data.filepath)
                if(detectedWords2) {
                    let price = parseInt(detectedWords2)
                    if(!isNaN(price)) {
                        let newProd = new TemplateItem(
                            data.data.newTemplateItem.numId,
                            data.data.newTemplateItem.name,
                            data.data.newTemplateItem.description,
                            [price]
                        )
                        let prodSaved = await newProd.save()
                        if (prodSaved) {
                            await new Items(
                                prodSaved.insertedId.toString(),
                                data.data.storeId,
                                price,
                                12,
                                data.data.filekey
                            ).save()
                            await new Message(
                                message.from,
                                'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                                'update_success',
                                data.data.preferredLanguage,
                                null
                            ).send()
                            messageToSend = new Message(
                                message.from,
                                'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                                'patti_menu',
                                data.data.preferredLanguage,
                                null
                            )
                            // await data.clearAllCache()
                            data.state = '00005'
                            await data.cacheState()
                        }
                    } else {
                        data.state = '00014'
                        await data.cacheState()
                        messageToSend = new Message(
                            message.from,
                            'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                            'try_again_template',
                            data.data.preferredLanguage,
                            null
                        )
                    }
                } else {
                    data.state = '00014'
                    await data.cacheState()
                    messageToSend = new Message(
                        message.from,
                        'db5dddd3_4383_4f7a_9b9b_31137461fa8f',
                        'try_again_template',
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