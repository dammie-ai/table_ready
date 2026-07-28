const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.post('/suppliers', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.createSupplier), purchaseOrderController.createSupplier);
router.get('/suppliers', authenticateToken, purchaseOrderController.getSuppliers);
router.patch('/suppliers/:id', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.updateSupplier), purchaseOrderController.updateSupplier);

router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.createPurchaseOrder), purchaseOrderController.createPurchaseOrder);
router.get('/', authenticateToken, purchaseOrderController.getPurchaseOrders);
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.updatePurchaseOrderStatus), purchaseOrderController.updatePurchaseOrderStatus);
router.post('/:id/receive', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), validate(schemas.receivePurchaseOrder), purchaseOrderController.receivePurchaseOrder);

router.post('/reorder-rules', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.createReorderRule), purchaseOrderController.createReorderRule);
router.get('/reorder-rules', authenticateToken, purchaseOrderController.getReorderRules);
router.get('/reorder-rules/auto-check', authenticateToken, authorizeRoles('admin', 'manager'), purchaseOrderController.autoReorderCheck);

module.exports = router;
