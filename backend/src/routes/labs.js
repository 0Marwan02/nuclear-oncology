const express = require('express');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadLabResult } = require('../controllers/labController');

const router = express.Router();

router.use(auth);
router.post('/', upload.single('labResult'), uploadLabResult);

module.exports = router;
