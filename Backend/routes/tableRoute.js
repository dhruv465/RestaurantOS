const express = require('express');
const router = express.Router();
const { createTable, getTables, updateTable } = require('../controllers/tableController');
const { isVerifiedUser } = require('../middlewares/tokenVerification');


router.route("/").post(isVerifiedUser, createTable);
router.route("/").get(isVerifiedUser, getTables);
router.route("/:id").put(isVerifiedUser, updateTable);

module.exports = router;
