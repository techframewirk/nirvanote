const joi = require('joi')
const db = require('../utils/db')
const { ObjectId } = require('mongodb')

const collectionName = 'templateItems'

const templateItemSchema = joi.object({
    _id: joi.string().optional(),
    numId: joi.number().required(),
    name: joi.string().required(),
    description: joi.string().required(),
    prices: joi.array().items(
        joi.number().required()
    ).required(),
    image: joi.string().optional(),
})

class TemplateItem {
    constructor(numId, name, description, prices, image, _id) {
        this._id = _id
        this.numId = numId
        this.name = name
        this.description = description
        this.prices = prices
        this.image = image
    }

    async validate() {
        try {
            let validatedData = await templateItemSchema.validateAsync(this)
            return validatedData
        } catch (err) {
            throw err
        }
    }

    async findById() {
        try {
            let result = await db.getDB().collection(collectionName).findOne({ _id: ObjectId(this._id)})
            return result
        } catch (err) {
            throw err
        }
    }

    async find(query,options){
        try {
            let result = await db.getDB().collection(collectionName).find(query,options).toArray()
            return result
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

    async saveMany(templateItems) {
        try {
            let validatedData = await joi.array().items(templateItemSchema).validateAsync(templateItems)
            let result = await db.getDB().collection(collectionName).insertMany(validatedData)
            return result
        } catch (err) {
            throw err
        }
    }

    async update(updateData) {
        try {
            let validatedData = await templateItemSchema.validateAsync(updateData)
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

    async findUsingKeyAndValue(key,value) {
        try {
            let result = await db.getDB().collection(collectionName).find({ [key]: value }).toArray()
            return result
        } catch (err) {
            throw err
        }
    }
}

module.exports = TemplateItem