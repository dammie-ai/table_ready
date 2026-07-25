const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

router.get('/category-sales', authenticateToken, authorizeRoles('admin', 'manager'), analyticsController.getCategorySales);
router.get('/staff-performance', authenticateToken, authorizeRoles('admin', 'manager'), analyticsController.getStaffPerformance);
router.get('/dish-of-week-stats', authenticateToken, authorizeRoles('admin', 'manager'), analyticsController.getDishOfWeekStats);

module.exports = router;