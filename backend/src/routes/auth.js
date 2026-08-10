const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

// Staff-account creation only — this is the users/staff table, not customer
// accounts (those live in customer_profiles and never touch this route).
// Must stay behind admin/manager auth: the request body lets the caller
// pick any role, so an open registration endpoint here is a direct path
// to self-granted manager access.
router.post('/register', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.register), authController.register);

router.post('/login', validate(schemas.login), authController.login);

router.delete('/account', authenticateToken, authController.deleteAccount);

module.exports = router;