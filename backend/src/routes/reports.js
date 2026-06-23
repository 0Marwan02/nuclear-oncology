const express = require('express');
const { auth, doctorOnly } = require('../middleware/auth');
const { generateReport, listReports } = require('../controllers/reportController');

const router = express.Router();

router.use(auth);

// Generate (or re-generate, bumping version) a report for a scan.
router.post('/:scanType/:scanId', doctorOnly, generateReport);

// List previously generated reports for a scan (version history, newest first).
router.get('/:scanType/:scanId', listReports);

module.exports = router;
