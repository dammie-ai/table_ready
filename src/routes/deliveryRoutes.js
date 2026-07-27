const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.post('/assign', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), validate(schemas.assignDriver), deliveryController.assignDriver);

router.post('/:orderId/status', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'delivery'), validate(schemas.updateDeliveryStatus), deliveryController.updateDeliveryStatus);

router.post('/:orderId/location', authenticateToken, authorizeRoles('delivery'), validate(schemas.updateDriverLocation), deliveryController.updateDriverLocation);

router.get('/history', authenticateToken, authorizeRoles('delivery'), deliveryController.getDeliveryHistory);

module.exports = router;
