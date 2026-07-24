const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

// Customer-facing menu browsing (public)
router.get('/', menuController.getMenuItems);
router.get('/:id', menuController.getMenuItemDetail);

// Staff recipe management (protected)
router.post('/:id/ingredients', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), menuController.addIngredientToMenuItem);
router.get('/:id/ingredients', authenticateToken, menuController.getMenuItemIngredients);
router.delete('/:id/ingredients/:inventoryId', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), menuController.removeIngredientFromMenuItem);

// Menu item CRUD (protected)
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), menuController.createMenuItem);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager'), menuController.updateMenuItem);
router.patch('/:id/toggle', authenticateToken, authorizeRoles('admin', 'manager'), menuController.toggleMenuItem);

module.exports = router;