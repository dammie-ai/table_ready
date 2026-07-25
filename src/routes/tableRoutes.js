const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

router.post('/verify', authenticateToken, tableController.verifyTableCode);
router.get('/floor-layout', authenticateToken, tableController.getFloorLayout);
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), tableController.updateTableStatus);
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), tableController.createTable);

module.exports = router;
