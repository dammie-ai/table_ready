const express = require('express');
const router = express.Router();
const dishOfWeekController = require('../controllers/dishOfWeekController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.get('/dish-of-week', dishOfWeekController.getDishOfWeek);
router.post('/dish-of-week/calculate', authenticateToken, authorizeRoles('admin', 'manager'), dishOfWeekController.calculateDishOfWeek);
router.post('/dish-of-week/override', authenticateToken, authorizeRoles('admin'), validate(schemas.overrideDishOfWeek), dishOfWeekController.overrideDishOfWeek);
router.get('/dish-of-week/active-discounts', dishOfWeekController.getActiveDiscounts);

module.exports = router;
