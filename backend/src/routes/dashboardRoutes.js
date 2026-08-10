const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

// /config is self-scoping — it derives the response entirely from the
// caller's own req.user.role, never a URL param, so any authenticated
// staff member seeing their own dashboard config is safe by design.
router.get('/config', authenticateToken, dashboardController.getDashboardConfig);

// Every route below returns data for a specific role (staff roster,
// today's revenue, audit logs, etc.) regardless of who calls it — none of
// the controller functions check req.user.role themselves, so the route
// itself is the only thing standing between, say, a kitchen login and the
// admin dashboard's revenue/audit-log data.
router.get('/waiter', authenticateToken, authorizeRoles('waiter', 'admin', 'manager'), dashboardController.getWaiterDashboard);

router.get('/kitchen', authenticateToken, authorizeRoles('kitchen', 'admin', 'manager'), dashboardController.getKitchenDashboard);

router.get('/delivery', authenticateToken, authorizeRoles('delivery', 'admin', 'manager'), dashboardController.getDeliveryDashboard);

router.get('/admin', authenticateToken, authorizeRoles('admin', 'manager'), dashboardController.getAdminDashboard);

router.get('/assistant_manager', authenticateToken, authorizeRoles('assistant_manager', 'admin', 'manager'), dashboardController.getAssistantManagerDashboard);

router.get('/other', authenticateToken, authorizeRoles('other', 'admin', 'manager'), dashboardController.getOtherDashboard);

// Manager-exclusive: ROLE_DASHBOARD_CONFIG.manager is the only one with
// hasMasterControl: true (customizer/branding config access) — admin is
// deliberately excluded here, not just an oversight.
router.get('/manager', authenticateToken, authorizeRoles('manager'), dashboardController.getManagerDashboard);

module.exports = router;
