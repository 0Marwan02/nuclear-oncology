const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const { createCase, updateCase } = require('../controllers/caseController');

const router = express.Router();

router.use(auth);
router.post('/', createCase);
router.put('/:id', adminOnly, updateCase);

module.exports = router;
