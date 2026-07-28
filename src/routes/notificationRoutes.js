const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.get('/templates', authenticateToken, notificationController.getNotificationTemplates);
router.post('/templates', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.createNotificationTemplate), notificationController.createNotificationTemplate);
router.patch('/templates/:id', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.updateNotificationTemplate), notificationController.updateNotificationTemplate);

router.post('/send', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.sendTestNotification), notificationController.sendNotification);
router.get('/logs', authenticateToken, authorizeRoles('admin', 'manager'), notificationController.getNotificationLogs);
router.get('/preferences', authenticateToken, notificationController.getNotificationPreferences);
router.patch('/preferences', authenticateToken, notificationController.updateNotificationPreferences);

module.exports = router;
