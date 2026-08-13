const express = require('express');
const router = express.Router();
const orderModificationController = require('../controllers/orderModificationController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.patch('/:orderId/modify-items', authenticateToken, authorizeRoles('admin', 'manager', 'waiter', 'kitchen'), validate(schemas.modifyOrderItems), orderModificationController.modifyOrderItems);
router.post('/:orderId/void-item/:itemId', authenticateToken, authorizeRoles('admin', 'manager'), orderModificationController.voidItem);
router.post('/:orderId/cash-payment', authenticateToken, authorizeRoles('admin', 'manager', 'waiter', 'delivery'), validate(schemas.recordCashPayment), orderModificationController.recordCashPayment);
router.post('/:orderId/tips/distribute', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.distributeTips), orderModificationController.distributeTips);

module.exports = router;
