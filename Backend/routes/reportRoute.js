const express = require('express');
const router = express.Router();
const { salesReport, dashboard } = require('../controllers/reportController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

router.get('/sales', isVerifiedUser, requirePermission('dashboard.view'), salesReport);
router.get('/dashboard', isVerifiedUser, requirePermission('dashboard.view'), dashboard);

module.exports = router;
