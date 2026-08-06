const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.post('/verify-code', validate(schemas.verifyTableCode), tableController.verifyTableCode);
router.get('/floor-layout', tableController.getFloorLayout);
router.get('/my-tables', authenticateToken, authorizeRoles('waiter'), tableController.getMyTables);
router.patch('/:id/assign-waiter', authenticateToken, authorizeRoles('admin', 'manager'), tableController.assignWaiter);
router.post('/check-location', validate(schemas.verifyLocation), tableController.verifyLocation);
router.post('/qr/generate', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), validate(schemas.generateQR), tableController.generateQRCode);
router.post('/qr/verify', validate(schemas.verifyQRCode), tableController.verifyQRCode);
router.patch('/:id/status', authenticateToken, authorizeRoles('admin', 'manager', 'waiter'), validate(schemas.updateTableStatus), tableController.updateTableStatus);
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.createTable), tableController.createTable);

module.exports = router;
