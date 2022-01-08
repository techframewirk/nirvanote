const joi = require('joi')
const db = require('../utils/db')
const { ObjectId } = require('mongodb')

const collectionName = 'items'

const itemSchema = joi.object({
    _id: joi.string().optional(),
    templateItemId: joi.string().required(),
    store: joi.string().required(),
    price: joi.number().required(),
    quantity: joi.number().required(),
    audio: joi.string().required(),
    added: joi.date().default(new Date())
})

class Item {
    constructor(templateItemId, store, price, quantity, audio, _id) {
        this._id = _id
        this.templateItemId = templateItemId
        this.store = store
        this.price = price
        this.quantity = quantity
        this.audio = audio
    }

    async validate() {
        try {
            let validatedData = await itemSchema.validateAsync(this)
            return validatedData
        } catch (err) {
            throw err
        }
    }

    async save() {
        try {
            let validatedData = await this.validate()
            let result = await db.getDB().collection(collectionName).insertOne(validatedData)
            return result
        } catch (err) {
            throw err
        }
    }

    static async find() {
        try {
            let result = await db.getDB().collection(collectionName).find().toArray()
            return result
        } catch (err) {
            throw err
        }
    }

    static async findUsingKeyAndValue(key, value) {
        try {
            let result = await db.getDB().collection(collectionName).find({ [key]: value }).toArray()
            return result
        } catch (err) {
            throw err
        }
    }

    async update() {
        try {
            let validatedData = await this.validate()
            delete validatedData._id
            let result = await db.getDB().collection(collectionName).updateOne({ _id: ObjectId(this._id) }, { $set: validatedData })
            return result
        } catch (err) {
            throw err
        }
    }

    async delete() {
        try {
            let result = await db.getDB().collection(collectionName).deleteOne({ _id: ObjectId(this._id) })
            return result
        } catch (err) {
            throw err
        }
    }
}

module.exports = Item