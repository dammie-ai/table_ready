const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.get('/', menuController.getMenuItems);
router.get('/:id', menuController.getMenuItemDetail);

router.post('/:id/ingredients', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), validate(schemas.addIngredient), menuController.addIngredientToMenuItem);
router.get('/:id/ingredients', authenticateToken, menuController.getMenuItemIngredients);
router.delete('/:id/ingredients/:inventoryId', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), menuController.removeIngredientFromMenuItem);

router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.createMenuItem), menuController.createMenuItem);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.updateMenuItem), menuController.updateMenuItem);
router.patch('/:id/toggle', authenticateToken, authorizeRoles('admin', 'manager'), menuController.toggleMenuItem);

module.exports = router;