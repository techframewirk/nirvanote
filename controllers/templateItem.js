var xlsx = require("xlsx");
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);

const path = require("path");
const multer = require("multer");
const TemplateItem = require("../models/TemplateItem");
const { getSignedURLFromS3, deleteFileFromS3 } = require("../utils/s3");
const { getStoresByLocation } = require("../models/store");
const { findUsingKeyAndValue } = require("../models/Items");

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + -+Math.round(Math.random() * 1000);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

exports.uploadExcelFile = () => upload.single("file");

exports.addBulkProductsFromExcelFile = async (req, res) => {
  try {
    const excelPath = req.file.path;
    if (excelPath) {
      const wb = xlsx.readFile(excelPath);
      unlinkFile(excelPath);
      const sheet = wb.SheetNames[0];
      let prices = xlsx.utils.sheet_to_json(wb.Sheets[sheet], {
        raw: false,
      });
      prices = prices.map(({ id, name, description, price, image }) => ({
        numId: id,
        name,
        description,
        prices: price.split(";"),
        image,
      }));
      let uploadedPrices = await new TemplateItem().saveMany(prices);
      if (uploadedPrices?.length) {
        return res.json({
          message: `Added ${uploadedPrices?.length} products successfully`,
          success: true,
          result: null,
        });
      } else {
        return res.status(400).json({
          message: "Something went wrong while uploading products",
          success: false,
          result: null,
        });
      }
    } else {
      return res.status(400).json({
        message: "Excel file is required",
        success: false,
        result: null,
      });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong", success: false, result: error });
  }
};

exports.getAllProducts = async (req, res) => {
  return res.json({
    result: [],
    message: "Retrieved products successfully",
    success: true,
  });
};

exports.getSingleProduct = async (req, res) => {
  try {
    let templateItem = new TemplateItem(req.params.id);
    let result = await templateItem.findById();
    let imageUri = await getSignedURLFromS3(
      result.image,
      parseInt(process.env.S3_URL_EXPIRY),
      process.env.S3_STORE_BUCKET
    );
    return res.json({
      result: { ...result, imageUri },
      message: "Retrieved product successfully",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong", success: false, result: error });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    let templateItem = new TemplateItem(req.params.id);
    let result = await templateItem.update(req.body);
    return res.json({
      result,
      message: "Updated product successfully",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong", success: false, result: error });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    let templateItem = new TemplateItem(req.params.id);
    let singleItem = await templateItem.findById();
    if (!singleItem) {
      return res.status(400).json({
        result: null,
        message: "Image already deleted or invalid id",
        success: false,
      });
    }
    let result = await templateItem.delete();
    await deleteFileFromS3(singleItem.image, process.env.S3_STORE_BUCKET);
    return res.json({
      result,
      message: "Deleted product successfully",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong", success: false, result: error });
  }
};

exports.getStoreByLocation = async () => {
  let stores = await getStoresByLocation(
    { min: 12.9, max: 12.9135 },
    { min: 77.61, max: 77.67 }
  );
  let storeIds = stores.map(store => store._id);

  let items = await findUsingKeyAndValue("store", {$in: storeIds})
};
