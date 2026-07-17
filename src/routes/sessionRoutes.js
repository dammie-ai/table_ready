const express = require('express');
const router = express.Router();
const { findOrCreateSession } = require('../controllers/sessionController');

// Route to join/create a session
router.post('/session', findOrCreateSession);

module.exports = router;