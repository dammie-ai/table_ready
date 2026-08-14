const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');
const { authenticateToken } = require('../middleware/authGuard');

router.post('/register', customerAuthController.register);
router.post('/login', customerAuthController.login);
router.patch('/profile', authenticateToken, customerAuthController.updateProfile);
// authenticateToken only verifies the JWT signature/expiry -- a customer
// token has no role field so authorizeRoles() would never work here; the
// controller itself checks req.user.type === 'customer'.
router.delete('/account', authenticateToken, customerAuthController.deleteAccount);

module.exports = router;
