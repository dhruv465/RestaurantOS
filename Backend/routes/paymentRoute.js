const express = require('express');
const router = express.Router();
const { isVerifiedUser } = require('../middlewares/tokenVerification');
const { createOrder, verifyPayment, webHookVerfication } = require('../controllers/paymentController');


router.route("/create-order").post(isVerifiedUser, createOrder);
router.route("/verify-payment").post(isVerifiedUser, verifyPayment);
router.route("/webhook-verification").post(webHookVerfication);


module.exports = router;
