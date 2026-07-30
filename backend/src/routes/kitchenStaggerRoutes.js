const express = require('express');
const router = express.Router();
const kitchenStaggerController = require('../controllers/kitchenStaggerController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

router.post('/orders/:orderId/cook/start/:itemId', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), kitchenStaggerController.startCooking);
router.post('/orders/:orderId/cook/release-held', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), kitchenStaggerController.releaseHeldItems);
router.post('/orders/:orderId/cook/ready/:itemId', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), kitchenStaggerController.markItemReady);
router.post('/orders/:orderId/cook/sync-status', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), kitchenStaggerController.syncOrderStatus);
router.get('/orders/:orderId/cook-tracking', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), kitchenStaggerController.getOrderTracking);
router.post('/orders/:orderId/cook/acknowledge-overdue/:itemId', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), kitchenStaggerController.acknowledgeOverdue);

module.exports = router;
