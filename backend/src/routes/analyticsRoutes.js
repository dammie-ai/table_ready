const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validateQuery, schemas } = require('../middleware/validation');

router.get('/category-sales', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), validateQuery(schemas.analyticsQuery), analyticsController.getCategorySales);
router.get('/staff-performance', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), validateQuery(schemas.analyticsQuery), analyticsController.getStaffPerformance);
router.get('/service-ratings', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), analyticsController.getServiceRatings);
router.get('/dish-of-week-stats', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), analyticsController.getDishOfWeekStats);
// Kitchen needs this one too (unlike the manager-tier-only routes above) --
// "top items" is meant for kitchen staff to see what's actually selling,
// not just managers.
router.get('/top-items', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager', 'kitchen'), analyticsController.getTopItems);

module.exports = router;