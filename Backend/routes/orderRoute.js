const express = require('express');
const router = express.Router();
const { addOrder, releaseNow, setOrderCustomer, acceptGuestOrder, declineGuestOrder, cancelOrder, moveOrder, mergeOrder, checkout, getOrderById, getOrders, updateOrder, deleteItemFromOrder, getOrderByTable, previewPrice } = require('../controllers/orderController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

const view = [isVerifiedUser, requirePermission('orders.view')];
const manage = [isVerifiedUser, requirePermission('orders.manage')];

router.route("/price").post(view, previewPrice);
router.route("/table/:tableId").get(view, getOrderByTable);
router.route("/").post(manage, addOrder);
router.route("/").get(view, getOrders);
router.route("/:id").get(view, getOrderById);
router.route("/:orderId/items/:itemId").delete(manage, deleteItemFromOrder);
router.route("/:id").put(manage, updateOrder);
router.post("/:id/cancel", isVerifiedUser, requirePermission('orders.cancel'), cancelOrder);
router.post("/:id/move", manage, moveOrder);
router.post("/:id/accept", manage, acceptGuestOrder);
router.post("/:id/release", manage, releaseNow);
router.put("/:id/customer", manage, setOrderCustomer);
router.post("/:id/decline", manage, declineGuestOrder);
router.post("/:id/merge", manage, mergeOrder);
router.post("/:id/checkout", isVerifiedUser, requirePermission('payments.collect'), checkout);

module.exports = router;
