const express = require('express');
const { auth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { roleFieldFilter } = require('../middleware/roleFieldFilter');
const {
  createPETCT, getPETCTs, getPETCT, updatePETCT, getPETCTHistory,
  createPSMAPETCT, getPSMAPETCTs, getPSMAPETCT, updatePSMAPETCT, getPSMAPETCTHistory,
  createThyroid, getThyroids, getThyroid, updateThyroid, getThyroidHistory,
  createBone, getBones, getBone, updateBone, getBoneHistory,
  createRenal, getRenals, getRenal, updateRenal, getRenalHistory,
  createGastric, getGastrics, getGastric, updateGastric, getGastricHistory,
  createMeckel, getMeckels, getMeckel, updateMeckel, getMeckelHistory,
  getAllScansForPatient,
  getScanStats
} = require('../controllers/scanController');

const router = express.Router();

router.use(auth);

// Stats
router.get('/stats', getScanStats);

// Aggregate scan history for a patient (all 7 modalities). `both` is an alias
// used by the history UI's sub-tabs.
router.get('/all/patient/:patientId', getAllScansForPatient);
router.get('/both/patient/:patientId', getAllScansForPatient);

// PET-CT
router.post('/petct', upload.single('scanFile'), createPETCT);
router.get('/petct', getPETCTs);
router.get('/petct/patient/:patientId', getPETCTHistory);
router.get('/petct/:id', getPETCT);
router.put('/petct/:id', upload.single('scanFile'), roleFieldFilter, updatePETCT);

// PSMA PET-CT
router.post('/psma', upload.single('scanFile'), createPSMAPETCT);
router.get('/psma', getPSMAPETCTs);
router.get('/psma/patient/:patientId', getPSMAPETCTHistory);
router.get('/psma/:id', getPSMAPETCT);
router.put('/psma/:id', upload.single('scanFile'), roleFieldFilter, updatePSMAPETCT);

// Thyroid
router.post('/thyroid', upload.single('scanFile'), createThyroid);
router.get('/thyroid', getThyroids);
router.get('/thyroid/patient/:patientId', getThyroidHistory);
router.get('/thyroid/:id', getThyroid);
router.put('/thyroid/:id', upload.single('scanFile'), roleFieldFilter, updateThyroid);

// Bone
router.post('/bone', upload.single('scanFile'), createBone);
router.get('/bone', getBones);
router.get('/bone/patient/:patientId', getBoneHistory);
router.get('/bone/:id', getBone);
router.put('/bone/:id', upload.single('scanFile'), roleFieldFilter, updateBone);

// Renal
router.post('/renal', upload.single('scanFile'), createRenal);
router.get('/renal', getRenals);
router.get('/renal/patient/:patientId', getRenalHistory);
router.get('/renal/:id', getRenal);
router.put('/renal/:id', upload.single('scanFile'), roleFieldFilter, updateRenal);

// Gastric
router.post('/gastric', upload.single('scanFile'), createGastric);
router.get('/gastric', getGastrics);
router.get('/gastric/patient/:patientId', getGastricHistory);
router.get('/gastric/:id', getGastric);
router.put('/gastric/:id', upload.single('scanFile'), roleFieldFilter, updateGastric);

// Meckel
router.post('/meckel', upload.single('scanFile'), createMeckel);
router.get('/meckel', getMeckels);
router.get('/meckel/patient/:patientId', getMeckelHistory);
router.get('/meckel/:id', getMeckel);
router.put('/meckel/:id', upload.single('scanFile'), roleFieldFilter, updateMeckel);

module.exports = router;
