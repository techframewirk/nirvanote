const { Translate } = require('@google-cloud/translate').v2

const translate = new Translate()

const translateText = async (text, targetLanguage) => {
    try {
        let [translation] = await translate.translate(text, targetLanguage)
        return translation
    } catch (err) {
        throw err
    }
}

const detectLanguage = async (text) => {
    try {
        let [detections] = await translate.detect(text)
        console.log(detections)
        return detections
    } catch (err) {
        throw err
    }
}

module.exports = {
    translateText,
    detectLanguage
}