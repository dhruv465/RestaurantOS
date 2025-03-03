const express = require('express');
const router = express.Router();
const { addTable, getTables, updateTable, deleteTable } = require('../controllers/tableController');
const { isVerifiedUser } = require('../middlewares/tokenVerification');


router.route("/").post(isVerifiedUser, addTable);
router.route("/").get(isVerifiedUser, getTables);
router.route("/:id").put(isVerifiedUser, updateTable);
router.delete("/:id", isVerifiedUser, deleteTable);

module.exports = router;
