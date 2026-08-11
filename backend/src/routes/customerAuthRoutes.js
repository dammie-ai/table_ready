const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');

router.post('/register', customerAuthController.register);
router.post('/login', customerAuthController.login);

module.exports = router;
