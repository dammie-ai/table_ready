const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.post('/', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), validate(schemas.createSchedule), scheduleController.createSchedule);
router.get('/', authenticateToken, scheduleController.getSchedules);
router.get('/my', authenticateToken, scheduleController.getMySchedule);
router.patch('/:id', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), validate(schemas.updateSchedule), scheduleController.updateSchedule);
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), scheduleController.deleteSchedule);

router.post('/time-entries/clock-in', authenticateToken, validate(schemas.clockInOut), scheduleController.clockIn);
router.post('/time-entries/clock-out', authenticateToken, validate(schemas.clockInOut), scheduleController.clockOut);
router.get('/time-entries', authenticateToken, authorizeRoles('admin', 'manager', 'assistant_manager'), scheduleController.getTimeEntries);

module.exports = router;
