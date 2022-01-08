const { sendMessage } = require('./whatsapp')
const cache = require('../utils/cache')

class Message {
    constructor(recepient, namespace, name, languageCode, components) {
        this.recepient = recepient;
        this.namespace = namespace;
        this.name = name;
        this.languageCode = languageCode;
        this.components = components;
    }

    async send() {
        try {
            // todo := send message
        } catch (err) {
            console.log(err)
        }
    }
}

class CachedState {
    constructor(number, state, data) {
        this.number = number;
        this.state = state;
        this.data = data;
    }

    getState() {
        return {
            number: this.number,
            state: this.state,
            data: this.data
        }
    }

    async cacheState() {
        await cache.setHashInCache(`${this.number}_${this.state}`, {
            number: this.number,
            state: this.state,
            data: JSON.stringify(this.data)
        })
    }

    async getStateFromCache() {
        let value = await cache.getHashFromCache(`${this.number}_${this.state}`)
        console.log(value)
    }
}

module.exports = {
    Message,
    CachedState
}