// const { getToken } = require('./whatsapp')
const axios = require('axios').default
const { getValueFromCache, cacheConstants } = require('./cache')

const sendMessage = async (message) => {
    try {
        let token = await getValueFromCache(cacheConstants.whatsappToken)
        let response = await axios.post(`${process.env.WHATSAPP_URL}/v1/messages/`, message, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        if(response.status === 201) {
            console.log('Message sent successfully!')
            return response.data.messages[0].id
        }
    } catch (err) {
        console.log(err.response.data)
        // throw err
    }
}

module.exports = sendMessage