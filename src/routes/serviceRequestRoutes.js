const express = require('express');
const router = express.Router();
const serviceRequestController = require('../controllers/serviceRequestController');
const { authenticateToken } = require('../middleware/authGuard');

// Customers can create service requests without login
router.post('/', serviceRequestController.createServiceRequest);

// Staff endpoints require auth
router.get('/', authenticateToken, serviceRequestController.getServiceRequests);
router.patch('/:id/acknowledge', authenticateToken, serviceRequestController.acknowledgeRequest);
router.patch('/:id/complete', authenticateToken, serviceRequestController.completeRequest);
router.patch('/:id/cancel', authenticateToken, serviceRequestController.cancelRequest);

module.exports = router;
