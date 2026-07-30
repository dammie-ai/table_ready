const express = require('express');
const router = express.Router();
const comboMealController = require('../controllers/comboMealController');

router.get('/', comboMealController.getComboMeals);
router.get('/:id', comboMealController.getComboMealDetail);

module.exports = router;
