const express = require('express');
const { auth } = require('../middleware/auth');
const { logRadiationDose } = require('../controllers/radiationController');

const router = express.Router();

router.use(auth);
router.post('/', logRadiationDose);

module.exports = router;
