const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

// Link or update an ingredient requirement for a menu item
router.post('/:id/ingredients', menuController.addIngredientToMenuItem);

// Fetch all ingredients required for a menu item
router.get('/:id/ingredients', menuController.getMenuItemIngredients);

// Remove an ingredient link from a menu item
router.delete('/:id/ingredients/:inventoryId', menuController.removeIngredientFromMenuItem);

module.exports = router;