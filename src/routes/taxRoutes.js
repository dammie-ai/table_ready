const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const { authenticateToken, authorizeRoles } = require('../middleware/authGuard');
const { validate, schemas } = require('../middleware/validation');

router.post('/jurisdictions', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.createTaxJurisdiction), taxController.createTaxJurisdiction);
router.get('/jurisdictions', authenticateToken, taxController.getTaxJurisdictions);

router.post('/rates', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.createTaxRate), taxController.createTaxRate);
router.get('/rates', authenticateToken, taxController.getTaxRates);

router.get('/orders/:order_id/calculate', authenticateToken, taxController.calculateOrderTax);

router.post('/exemptions', authenticateToken, authorizeRoles('admin', 'manager'), validate(schemas.createTaxExemption), taxController.createTaxExemption);
router.get('/exemptions', authenticateToken, taxController.getTaxExemptions);

module.exports = router;
