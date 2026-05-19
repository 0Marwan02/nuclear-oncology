const express = require('express');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadImagingResult } = require('../controllers/imagingController');

const router = express.Router();

router.use(auth);
router.post('/', upload.single('imagingResult'), uploadImagingResult);

module.exports = router;
