const joi = require('joi')
const db = require('../utils/db')

const collectionName = 'messages'

const messageSchema = joi.object({
    type: joi.string().allow('sent', 'received').required(),
    with: joi.string().required(),
    message: joi.object().required(),
    timestamp: joi.date().default(new Date())
})

const addMessage = async (message) => {
    try {
        let validatedData = await messageSchema.validateAsync(message)
        let result = await db.getDB().collection(collectionName).insertOne(validatedData)
        return result
    } catch (err) {
        throw err
    }
}

module.exports = {
    addMessage
}