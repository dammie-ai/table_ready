const express = require('express');
const router = express.Router();
const modifierController = require('../controllers/modifierController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.get('/', authenticateToken, modifierController.getModifiers);

router.get('/:id', authenticateToken, modifierController.getModifierById);

router.post('/', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager', 'kitchen'), validate(schemas.createModifier), modifierController.createModifier);

router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager', 'kitchen'), validate(schemas.updateModifier), modifierController.updateModifier);

router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), modifierController.deleteModifier);

router.get('/item/:menu_item_id', authenticateToken, modifierController.getMenuItemModifiers);

router.post('/item/:menu_item_id', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager', 'kitchen'), validate(schemas.addModifierToItem), modifierController.addModifierToItem);

router.delete('/item/:menu_item_id/:modifier_id', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager', 'kitchen'), modifierController.removeModifierFromItem);

module.exports = router;
