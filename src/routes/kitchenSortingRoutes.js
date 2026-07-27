const express = require('express');
const router = express.Router();
const kitchenSortingController = require('../controllers/kitchenSortingController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

router.get('/types', authenticateToken, kitchenSortingController.getOrderTypes);
router.get('/:order_type', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen', 'waiter'), kitchenSortingController.getOrdersByType);
router.get('/summary', authenticateToken, authorizeRoles('admin', 'manager'), kitchenSortingController.getAllOrderTypesSummary);
  router.get('/:order_type/details', authenticateToken, kitchenSortingController.getKitchenChannel);

module.exports = router;