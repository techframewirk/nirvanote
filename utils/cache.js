const { createClient } = require('redis')

let client = createClient({
    url: 'redis://192.168.0.15:6379'
})

const cacheConstants = {
    whatsappToken: "whatsappAuthToken"
}

const initiateConnection = async () => {
    try {
        await client.connect()
        console.log('Redis connection established')
    } catch (err) {
        console.log(err)
    }
}

const cacheKeyValue = async (key, value) => {
    try {
        await client.set(key, value)
    } catch (err) {
        throw err
    }
}

const getValueFromCache = async (key) => {
    try {
        let value = await client.get(key)
        return value
    } catch (err) {
        throw err
    }
}

module.exports = {
    cacheConstants,
    initiateConnection,
    cacheKeyValue,
    getValueFromCache
}