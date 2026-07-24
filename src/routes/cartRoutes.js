const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.post('/', cartController.createCart);
router.get('/:id', cartController.getCart);
router.post('/:id/items', cartController.addCartItem);
router.delete('/:id/items/:itemId', cartController.removeCartItem);
router.delete('/:id', cartController.clearCart);
router.post('/:id/checkout', cartController.checkout);

module.exports = router;
