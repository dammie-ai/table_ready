const express = require('express');
const router = express.Router();
const serviceRequestController = require('../controllers/serviceRequestController');
const { authenticateToken } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.post('/', validate(schemas.createServiceRequest), serviceRequestController.createServiceRequest);

router.get('/', authenticateToken, serviceRequestController.getServiceRequests);
router.patch('/:id/acknowledge', authenticateToken, serviceRequestController.acknowledgeRequest);
router.patch('/:id/complete', authenticateToken, serviceRequestController.completeRequest);
router.patch('/:id/cancel', authenticateToken, serviceRequestController.cancelRequest);

module.exports = router;
