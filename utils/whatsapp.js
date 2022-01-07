const axios = require('axios').default
const cache = require('./cache')

let token = null

const authenticateWithWhatsapp = async () => {
    try {
        let token = await cache.getValueFromCache(cache.cacheConstants.whatsappToken)
        if (token) {
            token = token
        } else {
            let authHeader = `${process.env.WHATSAPP_ADMIN_USERNAME}:${process.env.WHATSAPP_ADMIN_PASSWORD}`
            let authHeaderBase64 = Buffer.from(authHeader).toString('base64')
            let config = {
                method: 'POST',
                url: `${process.env.WHATSAPP_URL}/v1/users/login`,
                headers: {
                    'Authorization': `Basic ${authHeaderBase64}`,
                    'Content-Type': 'application/json'
                },
            }
            axios(config).then((response) => {
                cache.cacheKeyValue(cache.cacheConstants.whatsappToken, response.data.users[0].token)
                token = response.data.users[0].token
            }).catch((err) => {
                throw err
            })
        }
    } catch (err) {
        throw err
    }
}

module.exports = {
    authenticateWithWhatsapp
}