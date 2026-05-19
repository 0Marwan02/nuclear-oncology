const express = require('express');
const { auth } = require('../middleware/auth');
const { createVisit, listPatientVisits } = require('../controllers/visitController');
const { requireBodyFields, validateVisitCreate } = require('../middleware/validators');

const router = express.Router();

router.use(auth);
router.post('/', requireBodyFields(['patientId']), validateVisitCreate, createVisit);
router.get('/patient/:patientId', listPatientVisits);

module.exports = router;
