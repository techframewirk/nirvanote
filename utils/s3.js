const AWS = require('aws-sdk')
let fs = require('fs')

let s3 = new AWS.S3({
    apiVersion: "2006-03-01"
})

const pushFileToS3 = async (filname, filepath) => {
    try {
        let uploadParams = {
            Bucket: process.env.S3_BUCKET,
            Key: '',
            Body: ''
        }
        let fileStream = fs.createReadStream(filepath)
        fileStream.on('error', function (err) {
            throw err
        })
        uploadParams.Body = fileStream
        uploadParams.Key = filname
        s3.upload(uploadParams, function (err, data) {
            if (err) {
                throw err
            } else {
                console.log(data)
                fs.unlink(filepath, (err) => {
                    throw err
                })
            }
        })
        // todo := Add the S3 key to DB and return it to calling function
    } catch (err) {
        throw err
    }
}

const getSignedURLFromS3 = async (key, expiry) => {
    try {
        let signedUrl = s3.getSignedUrl( "getObject", {
            Key: key,
            Bucket: process.env.S3_BUCKET,
            Expires: expiry
        })
        if(signedUrl) {
            return signedUrl
        } else {
            return null
        }
    } catch (err) {
        throw err
    }
}

module.exports = {
    pushFileToS3,
    getSignedURLFromS3
}