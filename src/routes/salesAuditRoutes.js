const express = require('express');
const router = express.Router();
const salesAuditConfigController = require('../controllers/salesAuditConfigController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

router.get('/sales/configs', authenticateToken, authorizeRoles('admin', 'manager'), salesAuditConfigController.getConfigs);
router.post('/sales/configs', authenticateToken, authorizeRoles('admin'), salesAuditConfigController.createConfig);
router.patch('/sales/configs/:config_id', authenticateToken, authorizeRoles('admin'), salesAuditConfigController.updateConfig);
router.delete('/sales/configs/:config_id', authenticateToken, authorizeRoles('admin'), salesAuditConfigController.deleteConfig);
router.post('/sales/configs/:config_id/run-now', authenticateToken, authorizeRoles('admin', 'manager'), salesAuditConfigController.runAudit);
router.get('/sales/results', authenticateToken, authorizeRoles('admin', 'manager'), salesAuditConfigController.getResults);

module.exports = router;