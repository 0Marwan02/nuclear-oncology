const express = require('express');
const { auth } = require('../middleware/auth');
const {
  createGreenFile,
  getGreenFiles,
  getGreenFile,
  updateGreenFile,
  getGreenFileHistory,
  createRedFile,
  getRedFiles,
  getRedFile,
  updateRedFile,
  getRedFileHistory
} = require('../controllers/clinicController');

const router = express.Router();

router.use(auth);

router.post('/green', createGreenFile);
router.get('/green', getGreenFiles);
router.get('/green/patient/:patientId', getGreenFileHistory);
router.get('/green/:id', getGreenFile);
router.put('/green/:id', updateGreenFile);

router.post('/red', createRedFile);
router.get('/red', getRedFiles);
router.get('/red/patient/:patientId', getRedFileHistory);
router.get('/red/:id', getRedFile);
router.put('/red/:id', updateRedFile);

module.exports = router;
