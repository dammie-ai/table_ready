const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.post('/register', validate(schemas.register), authController.register);

router.post('/login', validate(schemas.login), authController.login);

router.delete('/account', authenticateToken, authController.deleteAccount);

module.exports = router;