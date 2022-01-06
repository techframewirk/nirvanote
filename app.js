require('dotenv').config()
const express = require('express')
const app = express()
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const AWS = require('aws-sdk')
let fs = require('fs')

AWS.config.update({
    region: 'ap-south-1',
})

const s3 = new AWS.S3({
    apiVersion: '2006-03-01'
})

app.use(express.json())

app.post('/add-voice', upload.single('file'), async (req, res, next) => {
    try {
        // s3.listBuckets((err, data) => {
        //     if (err) {
        //         console.log(err)
        //     } else {
        //         console.log(data.Buckets)
        //     }
        // })
        let uploadParams = {
            Bucket: 'stayhalo-voice',
            Key: '',
            Body: ''
        }
        let fileStream = fs.createReadStream(req.file.path)
        fileStream.on('error', function (err) {
            console.log('File Error', err)
        })
        uploadParams.Body = fileStream
        uploadParams.Key = req.file.originalname
        s3.upload(uploadParams, function (err, data) {
            if (err) {
                console.log("Error", err)
            } if (data) {
                console.log("Upload Success", data.Location)
            }
        })
        console.log(req.file.originalname)
        console.log(req.file.path)
        console.log(req.file.filename)
        res.status(200).json({
            message: 'Voice added successfully'
        })
    } catch (e) {
        console.log(e)
    }
})

app.get('/get-file', async(req, res, next) => {
    try {
        let signedUrl = s3.getSignedUrl( "getObject" ,{
            Key: req.body.key,
            Bucket: 'stayhalo-voice',
            Expires: 3600
        })
        res.status(200).json({
            url: signedUrl
        })
    } catch (e) {
        console.log(e)
    }
})

app.listen(3000, () => {
    console.log('Server started on port 3000')
})