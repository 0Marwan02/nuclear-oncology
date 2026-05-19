const express = require('express');
const { auth } = require('../middleware/auth');
const { createPatient, listPatients, getPatientById } = require('../controllers/patientController');
const { requireBodyFields, validatePatientCreate } = require('../middleware/validators');

const router = express.Router();

router.use(auth);
router.get('/', listPatients);
router.get('/:id', getPatientById);
router.post(
  '/',
  requireBodyFields(['nationalId', 'name', 'gender', 'birthDate', 'phone', 'address', 'bloodType']),
  validatePatientCreate,
  createPatient
);

module.exports = router;
