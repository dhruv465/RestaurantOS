const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getAuditLogs } = require('../controllers/settingsController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

router.route("/").get(isVerifiedUser, getSettings);
router.route("/").patch(isVerifiedUser, requirePermission('settings.manage'), updateSettings);
router.route("/audit").get(isVerifiedUser, requirePermission('audit.view'), getAuditLogs);

module.exports = router;
