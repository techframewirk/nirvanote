const express = require("express");
const {
  uploadExcelFile,
  addBulkProductsFromExcelFile,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/templateItem");
const router = express.Router();

router.post("/", uploadExcelFile(), addBulkProductsFromExcelFile);
router.get("/", getAllProducts);
router.get("/:id", getSingleProduct);
router.put("/:id", updateProduct );
router.delete('/:id', deleteProduct);
module.exports = router;
