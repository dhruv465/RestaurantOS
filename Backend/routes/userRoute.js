const express = require('express');
const router = express.Router();
const { register, login, getUserData, logout, getSetupStatus, listStaff, createStaff, updateStaff } = require('../controllers/userController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

const manageStaff = [isVerifiedUser, requirePermission('staff.manage')];

// Auth Routes
router.route("/setup").get(getSetupStatus);
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").post(isVerifiedUser, logout)
router.route("/").get(isVerifiedUser, getUserData);

// Staff
router.route("/staff").get(manageStaff, listStaff);
router.route("/staff").post(manageStaff, createStaff);
router.route("/staff/:id").patch(manageStaff, updateStaff);


module.exports = router;
