const express = require('express');
const { auth, doctorOnly, adminOnly } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  createTemplate, listTemplates, getTemplate, updateTemplate, setTemplateActive,
  addField, updateField, deleteField,
  createDynamicScan, listDynamicScans, getDynamicScan, getDynamicScanHistory, updateDynamicScan,
} = require('../controllers/dynamicScanController');

const router = express.Router();

router.use(auth);

// ===== Template CRUD =====
// Reading templates is open to any authenticated user (doctors pick active ones);
// writing is admin-only.
router.get('/templates', listTemplates);
router.get('/templates/:idOrKey', getTemplate);
router.post('/templates', adminOnly, createTemplate);
router.put('/templates/:id', adminOnly, updateTemplate);
router.patch('/templates/:id/active', adminOnly, setTemplateActive);
router.post('/templates/:id/fields', adminOnly, addField);
router.put('/templates/fields/:fieldId', adminOnly, updateField);
router.delete('/templates/fields/:fieldId', adminOnly, deleteField);

// ===== Dynamic scan records =====
router.post('/', doctorOnly, upload.single('scanFile'), createDynamicScan);
router.get('/', listDynamicScans);
router.get('/patient/:patientId', getDynamicScanHistory);
router.get('/:id', getDynamicScan);
// Role-aware field filtering for the JSON blob is handled inside the controller.
router.put('/:id', upload.single('scanFile'), updateDynamicScan);

module.exports = router;
