const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

// Staff-account creation only — this is the users/staff table, not customer
// accounts (those live in customer_profiles and never touch this route).
// assistant_manager has manage_staff and needs this for StaffManagement.tsx's
// "Add Staff" form, but the request body lets the caller pick any role, so
// authController.register itself blocks assistant_manager from granting
// admin/manager -- the escalation guard, not this route list, is what keeps
// this safe now that it's wider than admin/manager.
router.post('/register', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), validate(schemas.register), authController.register);

router.post('/login', validate(schemas.login), authController.login);

// authorizeRoles derives permission from req.user.role/roles — a customer
// token (type: 'customer', no role field at all) fails this and gets a
// clean 403, rather than reaching deleteAccount's raw `WHERE id =
// req.user.id` against the *staff* users table with a customer_id number
// that could easily collide with an unrelated staff member's id.
router.delete('/account', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager', 'kitchen', 'delivery', 'waiter', 'other'), authController.deleteAccount);

module.exports = router;