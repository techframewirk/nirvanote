const { createClient } = require('redis')

let client = createClient({
    url: process.env.REDIS
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

const setHashInCache = async (hash, data) => {
    try {
        await Object.entries(data).forEach(async ([key, value]) => {
            await client.hSet(hash, key, value)
        })
    } catch (err) {
        throw err
    }
}

const getHashFromCache = async (hash) => {
    try {
        let tempValue = await client.HGETALL(hash)
        let value = JSON.parse(JSON.stringify(tempValue))
        return value
    } catch (err) {
        throw err
    }
}

const clearCacheUsingKey = async (key) => {
    try {
        await client.DEL(key)
    } catch (err) {
        throw err
    }
}

module.exports = {
    cacheConstants,
    initiateConnection,
    cacheKeyValue,
    getValueFromCache,
    setHashInCache,
    getHashFromCache,
    clearCacheUsingKey
}