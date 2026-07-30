const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

router.use(authenticateToken);
router.use(authorizeRoles('admin', 'manager'));

router.post('/', auditLogController.createLog);
router.get('/', auditLogController.getLogs);

module.exports = router;
