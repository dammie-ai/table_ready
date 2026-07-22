const express = require('express');
const router = express.Router();

const { 
  checkEmployeeShift, 
  createSession, 
  getActiveSessions, 
  closeSession 
} = require('../controllers/sessionController');

// Line 6: Ensure checkEmployeeShift is passed as a valid function
router.post('/check-shift', checkEmployeeShift);
router.post('/', createSession);
router.get('/', getActiveSessions);
router.put('/:id/close', closeSession);

module.exports = router;