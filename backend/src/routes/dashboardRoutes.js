const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authGuard');

router.get('/config', authenticateToken, dashboardController.getDashboardConfig);

router.get('/waiter', authenticateToken, dashboardController.getWaiterDashboard);

router.get('/kitchen', authenticateToken, dashboardController.getKitchenDashboard);

router.get('/delivery', authenticateToken, dashboardController.getDeliveryDashboard);

router.get('/admin', authenticateToken, dashboardController.getAdminDashboard);

router.get('/assistant_manager', authenticateToken, dashboardController.getAssistantManagerDashboard);

router.get('/other', authenticateToken, dashboardController.getOtherDashboard);

router.get('/manager', authenticateToken, dashboardController.getManagerDashboard);

module.exports = router;
