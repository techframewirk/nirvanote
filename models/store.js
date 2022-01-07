const joi = require('joi')
const db = require('../utils/db')

const collectionName = 'stores'

const storeSchema = joi.object({
    name: joi.string().required(),
    mobile: joi.string().regex(/^[0-9]{12}$/).required(),
    location: joi.string().required(),
    preferredLanguage: joi.string().allow('english', 'kannada').required(),
})

const addStore = (store) => {
    try {
        let validatedData = await storeSchema.validateAsync(store)
        let count = await db.getDB().collection(collectionName).countDocuments({ mobile: validatedData.mobile })
        if (count > 0) {
            throw new Error('Store with this mobile number already exists')
        } else {
            let result = await db.getDB().collection(collectionName).insertOne(validatedData)
            return result.insertedId
        }
    } catch (err) {
        throw err
    }
}

const getAllStores = async () => {
    try {
        let result = await db.getDB().collection(collectionName).find().toArray()
        return result
    } catch (err) {
        throw err
    }
}

const getStoreUsingKeyAndValue = async (key, value) => {
    try {
        let result = await db.getDB().collection(collectionName).findOne({ [key]: value })
        return result
    } catch (err) {
        throw err
    }
}

module.exports = {
    addStore,
    getAllStores,
    getStoreUsingKeyAndValue
}