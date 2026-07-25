const express = require('express');
const router = express.Router();
const usualOrderController = require('../controllers/usualOrderController');

// Support both authenticated customers and guest sessions
router.get('/usual', usualOrderController.getTheUsualBySession);
router.get('/:customerId/usual', usualOrderController.getTheUsual);
router.post('/usual/reorder', usualOrderController.reorderTheUsualBySession);
router.post('/:customerId/usual/reorder', usualOrderController.reorderTheUsual);
router.post('/usual', usualOrderController.setTheUsualBySession);
router.post('/:customerId/usual', usualOrderController.setTheUsual);

module.exports = router;
