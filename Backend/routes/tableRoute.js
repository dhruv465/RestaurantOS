const express = require('express');
const router = express.Router();
const { addTable, getTables, updateTable, deleteTable, saveLayout, rotateQr, newGuestCode, listRequests, resolveRequest } = require('../controllers/tableController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');


router.route("/").post(isVerifiedUser, requirePermission('tables.manage'), addTable);
router.route("/").get(isVerifiedUser, requirePermission('orders.view'), getTables);
router.patch("/layout", isVerifiedUser, requirePermission('tables.manage'), saveLayout);
router.get("/requests", isVerifiedUser, requirePermission('orders.view'), listRequests);
router.patch("/requests/:id", isVerifiedUser, requirePermission('orders.manage'), resolveRequest);
router.post("/:id/qr", isVerifiedUser, requirePermission('tables.manage'), rotateQr);
router.post("/:id/guest-code", isVerifiedUser, requirePermission('orders.manage'), newGuestCode);
router.route("/:id").put(isVerifiedUser, requirePermission('orders.manage'), updateTable);
router.delete("/:id", isVerifiedUser, requirePermission('tables.manage'), deleteTable);

module.exports = router;
