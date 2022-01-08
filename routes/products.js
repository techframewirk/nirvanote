const express = require('express');
const { uploadExcelFile, addBulkProductsFromExcelFile } = require('../controllers/templateItem');
const router = express.Router()

router.post('/',uploadExcelFile(), addBulkProductsFromExcelFile)
router.get('/', getAllProducts)
router.get('/:id', )

module.exports = router