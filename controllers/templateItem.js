var xlsx = require("xlsx");
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);
const { ObjectId } = require("mongodb");

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
      return res.json({
        message: `Added products successfully`,
        success: true,
        result: uploadedPrices,
      });
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
  try {
    let { page, size, search, searchBy } = req.query;
    let templateItem = new TemplateItem();
    let query = {};
    page = page ? parseInt(page) : 1;
    size = size ? parseInt(size) : 20;
    let options = {
      limit: size,
      skip: (page - 1) * size,
    };
    if (search) {
      query[searchBy] = { $regex: search, $options: "i" };
    }
    let result = await templateItem.find(query, options);
    return res.status(200).json({
      result,
      message: "Products retrieved successfully",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: "Something went wrong",
      success: false,
      result: error,
    });
  }
};

exports.getAllProductsByLocation = async (req, res) => {
  let templateItem = new TemplateItem();
  let { lats, lons } = req.query;
  let query = {};
  let options = {};
  if (lats && lons) {
    lats = lats.split(",").map((num) => parseFloat(num.trim()));
    lons = lons.split(",").map((num) => parseFloat(num.trim()));
    let stores = await getStoresByLocation(
      { min: Math.min(...lats), max: Math.max(...lats) },
      { min: Math.min(...lons), max: Math.max(...lons) }
    );
    let storeIds = stores.map((store) => store._id.toString());
    let items = await findUsingKeyAndValue("store", { $in: storeIds });
    let uniqueTemplateItemsIds = items.reduce((acc, item) => {
      if (!acc.includes(item.templateItemId)) {
        acc.push(item.templateItemId);
      }
      return acc;
    }, []);
    query["_id"] = { $in: uniqueTemplateItemsIds.map((id) => ObjectId(id)) };
    let result = await templateItem.find(query, options);
    return res.status(200).json({
      result,
      message: "Products retrieved successfully",
      success: true,
    });
  } else {
    return res.status(400).json({
      result: null,
      message: "Latitude and Longitude required",
      success: false,
    });
  }
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
