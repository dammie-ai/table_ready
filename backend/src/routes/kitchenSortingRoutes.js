const express = require('express');
const router = express.Router();
const kitchenSortingController = require('../controllers/kitchenSortingController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validateQuery, schemas } = require('../middleware/validation');

router.get('/types', authenticateToken, kitchenSortingController.getOrderTypes);
router.get('/:order_type', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), validateQuery(schemas.kitchenOrdersQuery), kitchenSortingController.getOrdersByType);
router.get('/summary', authenticateToken, authorizeRoles('admin', 'manager'), kitchenSortingController.getAllOrderTypesSummary);
router.get('/:order_type/details', authenticateToken, kitchenSortingController.getKitchenChannel);

module.exports = router;