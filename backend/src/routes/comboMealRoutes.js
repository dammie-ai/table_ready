const express = require('express');
const router = express.Router();
const comboMealController = require('../controllers/comboMealController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.get('/', comboMealController.getComboMeals);
router.get('/:id', comboMealController.getComboMealDetail);

router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.createComboMeal), comboMealController.createComboMeal);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.updateComboMeal), comboMealController.updateComboMeal);
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), comboMealController.deleteComboMeal);

router.post('/:id/sides', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.addComboSide), comboMealController.addComboSide);
router.delete('/:id/sides/:sideId', authenticateToken, authorizeRoles('admin', 'manager'), comboMealController.removeComboSide);

module.exports = router;
