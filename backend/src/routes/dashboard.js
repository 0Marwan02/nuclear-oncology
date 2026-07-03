const express = require('express');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../utils/permissionCache');
const { getDashboardStats, getDailyStats } = require('../controllers/dashboardController');

const router = express.Router();

router.use(auth);

// Check access silently without failing heavily
router.get('/access', async (req, res, next) => {
  // Use the same requirePermission middleware, but catch the 403
  requirePermission('admin:dashboard')(req, res, (err) => {
    if (err) return next(err);
    res.json({ access: true });
  });
});

router.get('/daily-stats', getDailyStats);
router.get('/stats', requirePermission('admin:dashboard'), getDashboardStats);

module.exports = router;
