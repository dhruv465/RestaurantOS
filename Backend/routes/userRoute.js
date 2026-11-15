const express = require('express');
const router = express.Router();
const { forgetDevice, register, login, getUserData, logout, getSetupStatus, listStaff, createStaff, updateStaff } = require('../controllers/userController');
const { isVerifiedUser, requirePermission, isTrustedDevice } = require('../middlewares/tokenVerification');
const { pinUsers, pinLogin, pinClock } = require('../controllers/hrController');

const manageStaff = [isVerifiedUser, requirePermission('staff.manage')];

// Auth Routes
router.route("/setup").get(getSetupStatus);
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").post(isVerifiedUser, logout)
router.route("/").get(isVerifiedUser, getUserData);

// PIN sign-in and clock-in, only on devices where someone signed in with a password
router.get("/pin-users", isTrustedDevice, pinUsers);
router.post("/pin-login", isTrustedDevice, pinLogin);
router.post("/pin-clock", isTrustedDevice, pinClock);
router.post("/forget-device", forgetDevice);

// Staff
router.route("/staff").get(manageStaff, listStaff);
router.route("/staff").post(manageStaff, createStaff);
router.route("/staff/:id").patch(manageStaff, updateStaff);


module.exports = router;
