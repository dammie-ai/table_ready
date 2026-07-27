const express = require('express');
const router = express.Router();
const orderModificationController = require('../controllers/orderModificationController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

router.patch('/:orderId/modify-items', authenticateToken, authorizeRoles('admin', 'manager', 'waiter', 'kitchen'), orderModificationController.modifyOrderItems);
router.post('/:orderId/void-item/:itemId', authenticateToken, authorizeRoles('admin', 'manager'), orderModificationController.voidItem);
router.post('/:orderId/cash-payment', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), orderModificationController.recordCashPayment);
router.post('/:orderId/tips/distribute', authenticateToken, authorizeRoles('admin', 'manager'), orderModificationController.distributeTips);

module.exports = router;
