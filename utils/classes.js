const { sendMessage } = require('./whatsapp')

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

module.exports = {
    Message
}