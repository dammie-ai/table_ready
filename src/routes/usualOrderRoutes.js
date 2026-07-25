const express = require('express');
const router = express.Router();
const usualOrderController = require('../controllers/usualOrderController');
const { authenticateToken } = require('../middleware/authGuard');

router.get('/:customerId/usual', authenticateToken, usualOrderController.getTheUsual);
router.post('/:customerId/usual/reorder', authenticateToken, usualOrderController.reorderTheUsual);
router.post('/:customerId/usual', authenticateToken, usualOrderController.setTheUsual);

module.exports = router;
