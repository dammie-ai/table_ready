const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

// POST /api/auth/register (Employees)
router.post('/register', authController.register);

// POST /api/auth/login (Employees)
router.post('/login', authController.login);

// DELETE /api/auth/account (Protected: Admins or authenticated employees)
router.delete('/account', authenticateToken, authController.deleteAccount);

module.exports = router;