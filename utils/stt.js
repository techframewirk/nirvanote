const speech = require("@google-cloud/speech")
const fs = require("fs")

const client = new speech.SpeechClient()

const convertToText = async (filepath) => {
    try {
        let config = {
            encoding: "OGG_OPUS",
            sampleRateHertz: 16000,
            languageCode: "en-US",
        }
        let audio = {
            content: fs.readFileSync(filepath).toString("base64")
        }
        let request = {
            config: config,
            audio: audio
        }
        let [response] = await client.recognize(request)
        let transcription = response.results.map(result => result.alternatives[0].transcript).join(",")
        return transcription
    } catch (err) {
        console.log(err)
    }
}

module.exports = {
    convertToText
}