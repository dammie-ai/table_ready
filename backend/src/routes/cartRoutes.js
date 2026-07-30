const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { validate, schemas } = require('../middleware/validation');

router.post('/', validate(schemas.createCart), cartController.createCart);
router.get('/:id', cartController.getCart);
router.post('/:id/items', validate(schemas.addCartItem), cartController.addCartItem);
router.delete('/:id/items/:itemId', cartController.removeCartItem);
router.delete('/:id', cartController.clearCart);
router.post('/:id/checkout', validate(schemas.checkout), cartController.checkout);

module.exports = router;
