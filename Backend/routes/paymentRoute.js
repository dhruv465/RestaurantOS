const express = require('express');
const router = express.Router();
const { isVerifiedUser } = require('../middlewares/tokenVerification');
const { createOrder } = require('../controllers/paymentController');


router.route("/create-order").post(isVerifiedUser, createOrder);


module.exports = router;
