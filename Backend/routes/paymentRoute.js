const express = require('express');
const router = express.Router();
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');
const { createOrder, verifyPayment, webHookVerfication, refundOrder } = require('../controllers/paymentController');

const collect = [isVerifiedUser, requirePermission('payments.collect')];

router.route("/create-order").post(collect, createOrder);
router.route("/verify-payment").post(collect, verifyPayment);
router.route("/webhook-verification").post(webHookVerfication);
router.post("/refund", isVerifiedUser, requirePermission('refunds.process'), refundOrder);


module.exports = router;
