var xlsx = require("xlsx");
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);

const path = require("path");
const multer = require("multer");
const TemplateItem = require("../models/TemplateItem");

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

exports.addBulkProductsFromExcelFile = (req, res) => {
  try {
    const excelPath = req.file.path;
    const wb = xlsx.readFile(excelPath);
    unlinkFile(excelPath);
    const sheet = wb.SheetNames[0];
    let prices = xlsx.utils.sheet_to_json(wb.Sheets[sheet], {
      raw: false,
    });
    prices = prices.map(({ id, name, description, price, image }) => ({ numId:id,name,description,prices:price.split(";"),image }))
    let uploadedPrices = new TemplateItem().saveMany(prices)

    return res.json({
      prices:uploadedPrices,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Something went wrong", success: false, result: error });
  }
};

exports.getOneProduct = (req,res) => {
  
}