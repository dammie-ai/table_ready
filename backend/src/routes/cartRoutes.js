const express = require('express');
const router = express.Router();
const db = require('../config/db');
const pool = db.pool || db;
const cartController = require('../controllers/cartController');
const { validate, schemas } = require('../middleware/validation');

// Cart IDs are sequential integers with no auth in front of them — without
// this, anyone can view, modify, clear, or force-checkout another table's
// active cart just by guessing its ID. createCart now generates
// session_token server-side; every other cart route requires it match.
const verifyCartOwnership = async (req, res, next) => {
  const { id } = req.params;
  const token = req.body?.session_token || req.query?.session_token;

  try {
    const result = await pool.query('SELECT session_token FROM carts WHERE cart_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cart not found.' });
    }
    if (!token || token !== result.rows[0].session_token) {
      return res.status(403).json({ success: false, error: 'You do not have permission to access this cart.' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

router.post('/', validate(schemas.createCart), cartController.createCart);
router.get('/:id', verifyCartOwnership, cartController.getCart);
router.post('/:id/items', verifyCartOwnership, validate(schemas.addCartItem), cartController.addCartItem);
router.delete('/:id/items/:itemId', verifyCartOwnership, cartController.removeCartItem);
router.delete('/:id', verifyCartOwnership, cartController.clearCart);
router.post('/:id/checkout', verifyCartOwnership, validate(schemas.checkout), cartController.checkout);

module.exports = router;
