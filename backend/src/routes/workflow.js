const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { roleFieldFilter } = require('../middleware/roleFieldFilter');
const {
  advanceWorkflow,
  updateWorkflowStatus,
  getRecordsByStatus,
  getAllByStatus,
  getPatientWorkflow,
  getRegisteredVisits,
} = require('../controllers/workflowController');

router.get('/all', auth, getAllByStatus);
router.get('/nurse-queue', auth, getRegisteredVisits);
router.put('/:type/:id/advance', auth, roleFieldFilter, advanceWorkflow);
router.put('/:type/:id/status', auth, updateWorkflowStatus);
router.get('/patient/:patientId', auth, getPatientWorkflow);
router.get('/:type', auth, getRecordsByStatus);

module.exports = router;
