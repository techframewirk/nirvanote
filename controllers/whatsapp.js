const whatsapp = require('../utils/whatsapp')
const cache = require('../utils/cache')
const { CachedState } = require('../utils/classes')

const stateMessage = {
    '00001': 'storeName',
}

const handleTextMessage = async (message, contact, cachedData) => {
    try {
        let data = new CachedState(cachedData.number, cachedData.state, cachedData.data)
        switch(data.state) {
            case '00001':
                console.log('First')
                data.clearAllCache()
                break
            default:
                console.log('Default')
        }
    } catch (err) {
        throw err
    }
}

module.exports = {
    handleTextMessage
}