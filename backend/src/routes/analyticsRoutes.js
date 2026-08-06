const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validateQuery, schemas } = require('../middleware/validation');

router.get('/category-sales', authenticateToken, authorizeRoles('admin', 'manager'), validateQuery(schemas.analyticsQuery), analyticsController.getCategorySales);
router.get('/staff-performance', authenticateToken, authorizeRoles('admin', 'manager'), validateQuery(schemas.analyticsQuery), analyticsController.getStaffPerformance);
router.get('/service-ratings', authenticateToken, authorizeRoles('admin', 'manager'), analyticsController.getServiceRatings);
router.get('/dish-of-week-stats', authenticateToken, authorizeRoles('admin', 'manager'), analyticsController.getDishOfWeekStats);

module.exports = router;