const db = require('../utils/db')

const collectionName = 'messages'

const addMessage = async (message) => {
    try {
        let result = await db.getDB().collection(collectionName).insertOne(message)
        return result
    } catch (err) {
        throw err
    }
}

module.exports = {
    addMessage
}