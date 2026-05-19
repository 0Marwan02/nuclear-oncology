const express = require('express');
const router = express.Router();
const { getUsers, createUser, toggleUserStatus, getAuditLogs } = require('../controllers/adminController');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth, adminOnly);

router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id/status', toggleUserStatus);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
