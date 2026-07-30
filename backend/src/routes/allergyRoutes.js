const express = require('express');
const router = express.Router();
const allergyScanner = require('../utils/allergyScanner');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');

router.get('/scan/:order_id', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), allergyScanner.scanOrderForAllergens);
router.get('/alerts', authenticateToken, authorizeRoles('admin', 'manager', 'kitchen'), allergyScanner.getAllergyAlerts);
router.get('/menu/:item_id', authenticateToken, allergyScanner.scanMenuItemForAllergens);
router.patch('/menu/:item_id/allergens', authenticateToken, authorizeRoles('admin', 'manager'), allergyScanner.addAllergensToMenuItem);
router.get('/summary', authenticateToken, authorizeRoles('admin', 'manager'), allergyScanner.getAllergenSummary);

module.exports = router;