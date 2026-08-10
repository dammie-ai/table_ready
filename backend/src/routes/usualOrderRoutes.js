const express = require('express');
const router = express.Router();
const usualOrderController = require('../controllers/usualOrderController');

// Session-scoped only — the :customerId-based versions of these (removed)
// took the customer ID straight from the URL with no ownership check at
// all, letting anyone view or trigger a real order (with real inventory
// deduction) on another customer's behalf. Nothing in either frontend app
// ever called them; these session-based versions are the only real path.
router.get('/usual', usualOrderController.getTheUsualBySession);
router.post('/usual/reorder', usualOrderController.reorderTheUsualBySession);
router.post('/usual', usualOrderController.setTheUsualBySession);

module.exports = router;
