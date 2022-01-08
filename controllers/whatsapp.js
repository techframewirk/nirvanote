const whatsapp = require('../utils/whatsapp')
const cache = require('../utils/cache')
const { CachedState, Message } = require('../utils/classes')

const stateMessage = {
    '00001': 'storeName',
}

const handleTextMessage = async (message, contact, cachedData) => {
    try {
        let data = new CachedState(cachedData.number, cachedData.state, cachedData.data)
        let messageToSend = null
        switch(data.state) {
            case '00001':
                console.log('First')
                data.clearAllCache()
                break
            default:
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
        if (messageToSend != null) {
            messageToSend.send()
        }
    } catch (err) {
        throw err
    }
}

const handleButtonMessage = async (message, contact, cachedData) => {
    try {
        let data = new CachedState(cachedData.number, cachedData.state, cachedData.data)
        let messageToSend = null
        switch(data.state) {
            case '00001':
                console.log(message)
                data.clearAllCache()
                break
        }
        if (messageToSend != null) {
            messageToSend.send()
        }
    } catch (err) {
        throw err
    }
}

module.exports = {
    handleTextMessage,
    handleButtonMessage
}