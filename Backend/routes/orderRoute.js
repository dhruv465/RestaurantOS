const express = require('express');
const router = express.Router();
const { addOrder, getOrderById, getOrders, updateOrder, deleteItemFromOrder } = require('../controllers/orderController');
const { isVerifiedUser } = require('../middlewares/tokenVerification');


router.route("/").post(isVerifiedUser, addOrder);
router.route("/:id").get(isVerifiedUser, getOrderById);
router.route("/").get(isVerifiedUser, getOrders);
router.route("/:orderId/items/:itemId").delete(isVerifiedUser, deleteItemFromOrder);
router.route("/:id").put(isVerifiedUser, updateOrder);

module.exports = router;
