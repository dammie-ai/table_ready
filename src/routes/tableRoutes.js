const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

router.post('/verify-code', tableController.verifyTableCode);
router.get('/floor-layout', tableController.getFloorLayout);
router.post('/check-location', tableController.verifyLocation);
router.post('/qr/generate', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), tableController.generateQRCode);
router.post('/qr/verify', tableController.verifyQRCode);
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), tableController.updateTableStatus);
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), tableController.createTable);

module.exports = router;
