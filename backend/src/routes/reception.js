const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const { openEncounter } = require('../controllers/receptionController');

router.use(auth);
router.post('/open-encounter', requireRole('reception', 'admin', 'doctor'), openEncounter);

module.exports = router;
