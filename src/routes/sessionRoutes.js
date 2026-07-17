const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// Route to find or create a session by table_id
router.post('/session', sessionController.findOrCreateSession);

// Route to join an active session using a 4-digit code
router.post('/session/join', sessionController.joinSessionByCode);

module.exports = router;