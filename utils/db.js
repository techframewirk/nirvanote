const { MongoClient } = require('mongodb')

let db = null

const establishConnection = async (callback) => {
    try {
        const client = new MongoClient(
            process.env.MONGOURL,
            {
                maxPoolSize: 25,
                minPoolSize: 10
            }
        )
        client.connect().then(mongoClient => {
            console.log('Connected to MongoDB')
            db = mongoClient.db(process.env.dbName)
            callback()
        })
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}

const getDB = () => {
    if (db) {
        return db
    } else {
        throw new Error('Database not connected')
    }
}

module.exports = {
    establishConnection,
    getDB
}