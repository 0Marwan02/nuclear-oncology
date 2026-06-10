const express = require('express');
const router = express.Router();
const { getUsers, createUser, toggleUserStatus, getAuditLogs, getPermissionMatrix, setRolePermission, resetRolePermissions, getUserPermissions, setUserPermission, removeUserPermission } = require('../controllers/adminController');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth, adminOnly);

router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id/status', toggleUserStatus);
router.get('/audit-logs', getAuditLogs);

router.get('/permissions', getPermissionMatrix);
router.post('/permissions', setRolePermission);
router.post('/permissions/reset', resetRolePermissions);

router.get('/users/:userId/permissions', getUserPermissions);
router.post('/users/:userId/permissions', setUserPermission);
router.delete('/users/:userId/permissions/:permission', removeUserPermission);

module.exports = router;
