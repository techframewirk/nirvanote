require("dotenv").config();
const express = require("express");
const app = express();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const AWS = require("aws-sdk");
const morgan = require("morgan");

AWS.config.update({
  region: process.env.S3_REGION,
});

// const s3 = new AWS.S3({
//     apiVersion: '2006-03-01'
// })

app.use(express.json());
app.use(morgan("tiny"));

// Utils Import
let db = require("./utils/db");
let s3 = require("./utils/s3");
let cache = require("./utils/cache");
let whatsapp = require("./utils/whatsapp");
let { CachedState } = require("./utils/classes");
const {
  uploadExcelFile,
  addBulkProductsFromExcelFile,
  getStoreByLocation,
} = require("./controllers/templateItem");


app.use("/products", require('./routes/products'));

app.post("/", async (req, res, next) => {
  try {
    console.log(JSON.stringify(req.body));
    res.status(200).json({
      message: "success",
    });
  } catch (error) {
    console.log(error);
  }
});

app.post("/add-voice", upload.single("file"), async (req, res, next) => {
  try {
    // s3.listBuckets((err, data) => {
    //     if (err) {
    //         console.log(err)
    //     } else {
    //         console.log(data.Buckets)
    //     }
    // })
    // let uploadParams = {
    //     Bucket: 'stayhalo-voice',
    //     Key: '',
    //     Body: ''
    // }
    // let fileStream = fs.createReadStream(req.file.path)
    // fileStream.on('error', function (err) {
    //     console.log('File Error', err)
    // })
    // uploadParams.Body = fileStream
    // uploadParams.Key = req.file.originalname
    // s3.upload(uploadParams, function (err, data) {
    //     if (err) {
    //         console.log("Error", err)
    //         fs.unlink(req.file.path, (err) => {
    //             if (err) {
    //                 console.log(err)
    //             }
    //         })
    //     } if (data) {
    //         console.log("Upload Success", data.Location)
    //     }
    // })
    // console.log(req.file.originalname)
    // console.log(req.file.path)
    // console.log(req.file.filename)
    // console.log(req.file)
    await s3.pushFileToS3(req.file.originalname, req.file.path);
    res.status(200).json({
      message: "Voice added successfully",
    });
  } catch (e) {
    console.log(e);
  }
});

app.get("/get-file", async (req, res, next) => {
  try {
    // let signedUrl = s3.getSignedUrl( "getObject" ,{
    //     Key: req.body.key,
    //     Bucket: 'stayhalo-voice',
    //     Expires: parseInt(process.env.S3_URL_EXPIRY)
    // })
    let signedUrl = await s3.getSignedURLFromS3(
      req.body.key,
      parseInt(process.env.S3_URL_EXPIRY)
    );
    res.status(200).json({
      url: signedUrl,
    });
  } catch (e) {
    console.log(e);
  }
});

app.post(
  `/webhook/whatsapp/${process.env.WHATSAPP_WEBHOOK_SECRET}`,
  whatsapp.listenToWhatsapp
);

app.post("/test", async (req, res, next) => {
  try {
    let cacheState = new CachedState("919482466762", "nameRequested", {
      test: "test",
    });
    await cacheState.cacheState();
    await cacheState.getStateFromCache();
    res.status(200).json({
      message: "success",
    });
  } catch (e) {
    console.log(e);
  }
});

db.establishConnection(async () => {
  try {
    await cache.initiateConnection();
    await whatsapp.authenticateWithWhatsapp();
    await whatsapp.setWhatsappWebhook();
    let PORT = process.env.PORT || "3000"
    app.listen(PORT, () => {
      console.log("Server Started on PORT",PORT);
    });
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
});
