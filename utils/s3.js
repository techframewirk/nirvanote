const AWS = require("aws-sdk");
let fs = require("fs");

let s3 = new AWS.S3({
  apiVersion: "2006-03-01",
});

const pushFileToS3 = async (filname, filepath) => {
  try {
    let uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: "",
      Body: "",
    };
    let fileStream = fs.createReadStream(filepath);
    fileStream.on("error", function (err) {
      throw err;
    });
    uploadParams.Body = fileStream;
    uploadParams.Key = filname;
    return new Promise((resolve, reject) => {
      s3.upload(uploadParams, function (err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data.key);
          // fs.unlink(filepath, (err) => {
          //   if (err) {
          //     reject(err);
          //   } else {
          //     resolve(data.key);
          //   }
          // });
        }
      })
    });
    // todo := Add the S3 key to DB and return it to calling function
  } catch (err) {
    throw err;
  }
};

const getSignedURLFromS3 = async (key, expiry, bucket) => {
  try {
    let signedUrl = s3.getSignedUrl("getObject", {
      Key: key,
      Bucket: bucket || process.env.S3_BUCKET,
      Expires: expiry,
    });
    if (signedUrl) {
      return signedUrl;
    } else {
      return null;
    }
  } catch (err) {
    throw err;
  }
};

const deleteFileFromS3 = async (key, bucket) => {
  try {
    let deletedFile = s3.deleteObject({
      Key: key,
      Bucket: bucket || process.env.S3_BUCKET,
    });
    return deletedFile;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  pushFileToS3,
  getSignedURLFromS3,
  deleteFileFromS3
};
