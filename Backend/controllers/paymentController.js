const Razorpay = require("razorpay");
const config = require("../config/config");
const crypto = require("crypto");
const Payment = require("../models/paymentModel");
const createHttpError = require("http-errors");
const Order = require("../models/orderModel");
const mongoose = require("mongoose");
const { toPaise } = require("../utils/pricing");
const { applyPayments, applyRefund } = require("../utils/checkout");
const { record } = require("../utils/audit");
const { emit } = require("../utils/realtime");

const createOrder = async (req, res, next) => {
    const razorpay = new Razorpay({
        key_id: config.razorpayKeyId,
        key_secret: config.razorpaySecretKey,
    });

    try {
        // The amount comes from the server-priced order, never from the client.
        const { orderId } = req.body;
        if (!mongoose.isValidObjectId(orderId)) return next(createHttpError(400, "orderId is required"));

        const order = await Order.findById(orderId);
        if (!order) return next(createHttpError(404, "Order not found"));

        if (order.paymentStatus === "Paid") return next(createHttpError(409, "Order is already paid"));
        const amount = (order.bills?.totalPaise ?? toPaise(order.bills?.grandTotal)) - (order.paidPaise || 0);
        if (!amount || amount < 100) return next(createHttpError(400, "Amount due is too small to pay online (minimum ₹1)"));

        const rzpOrder = await razorpay.orders.create({
            amount,
            currency: "INR",
            receipt: order.orderNo || `receipt_${order._id}`,
        });

        // Remember which Razorpay order belongs to this order so verify/webhook can match it.
        order.paymentData = { razorpay_order_id: rzpOrder.id, amountPaise: amount };
        await order.save();

        res.json({ success: true, order: rzpOrder });
    } catch (error) {
        // Razorpay SDK errors have no .message; surface their description instead of a blank error.
        if (error?.error?.description) return next(createHttpError(502, `Razorpay: ${error.error.description}`));
        next(error);
    }
};

const verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

        const expectedSignature = crypto
            .createHmac("sha256", config.razorpaySecretKey)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            // Find the order
            if (!mongoose.isValidObjectId(orderId)) return next(createHttpError(400, "orderId is required"));
            const order = await Order.findById(orderId);
            if (!order) return next(createHttpError(404, "Order not found"));
            // A valid signature only proves this Razorpay order was paid; make sure it is the one created for this order.
            if (order.paymentData?.razorpay_order_id !== razorpay_order_id) {
                return next(createHttpError(400, "Payment does not belong to this order"));
            }

            // requestId = Razorpay payment id, so a repeated verify can't add the payment twice.
            const { order: paidOrder, replay } = await applyPayments(order._id, {
                requestId: razorpay_payment_id,
                payments: [{ method: "Online", amountPaise: order.paymentData.amountPaise, tenderedPaise: order.paymentData.amountPaise, changePaise: 0, reference: razorpay_payment_id, by: req.user._id }],
            });
            await Order.updateOne({ _id: order._id }, { "paymentData.razorpay_payment_id": razorpay_payment_id });
            if (!replay) record(req.user, 'payment.online', 'order', order._id, { orderNo: order.orderNo, razorpay_payment_id, amountPaise: order.paymentData.amountPaise });

            // Check if payment already exists before creating a new one
            const existingPayment = await Payment.findOne({ paymentId: razorpay_payment_id });
            if (!existingPayment) {
                // Create a new payment record
                const newPayment = new Payment({
                    paymentId: razorpay_payment_id,
                    orderId: orderId,
                    amount: (order.paymentData.amountPaise || 0) / 100,
                    currency: "INR",
                    status: "captured",
                    method: "Online",
                    email: order.customerDetails?.email || "",
                    contact: order.customerDetails?.phone || "",
                    createdAt: new Date()
                });

                await newPayment.save();
                console.log("Payment saved to database:", newPayment);
            } else {
                console.log("Payment already exists, skipping creation:", existingPayment);
            }

            return res.json({
                success: true,
                message: "Payment verified and saved successfully!",
                order: paidOrder
            });
        } else {
            return next(createHttpError(400, "Payment verification failed!"));
        }
    } catch (error) {
        console.error("Payment verification error:", error);
        next(error);
    }
};

const webHookVerfication = async (req, res, next) => {
    try {
        const secret = config.razorpyWebhookSecret;
        const signature = req.headers["x-razorpay-signature"];

        const body = JSON.stringify(req.body); // Convert payload to string

        // Verify the signature
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body)
            .digest("hex");

        if (expectedSignature === signature) {
            console.log("✅ Webhook verified:", req.body);

            // Process payment (e.g., update DB, send confirmation email)
            if (req.body.event === "payment.captured" || req.body.event === "payment.authorized") {
                const payment = req.body.payload.payment.entity;
                console.log(`💰 Payment ${req.body.event}: ${payment.amount / 100} INR`);

                // First check if this payment already exists
                const existingPayment = await Payment.findOne({ paymentId: payment.id });
                if (existingPayment) {
                    console.log("Payment already recorded:", existingPayment);
                    return res.json({ success: true, message: "Payment already processed" });
                }

                // Create a new payment record
                const newPayment = new Payment({
                    paymentId: payment.id,
                    orderId: payment.order_id,
                    amount: payment.amount / 100,
                    currency: payment.currency,
                    status: payment.status,
                    method: payment.method,
                    email: payment.email,
                    contact: payment.contact,
                    createdAt: new Date(payment.created_at * 1000)
                });

                await newPayment.save();
                console.log("Payment saved from webhook:", newPayment);

                // If we have an order_id, update the Order document as well
                if (payment.order_id) {
                    try {
                        // Find any order with this Razorpay order ID
                        const order = await Order.findOne({
                            'paymentData.razorpay_order_id': payment.order_id
                        });

                        if (order) {
                            order.paymentMethod = "Online";
                            order.paymentData = {
                                ...order.paymentData,
                                status: payment.status,
                                captured: true
                            };
                            await order.save();
                            console.log("Order updated with payment status:", order._id);
                        }
                    } catch (orderError) {
                        console.error("Failed to update order:", orderError);
                    }
                }
            }

            res.json({ success: true });
        } else {
            const error = createHttpError(400, "❌ Invalid Signature!");
            return next(error);
        }
    } catch (error) {
        console.log("Webhook error:", error);
        next(error);
    }
};

// POST /api/payment/refund { orderId, requestId, amountPaise, method, reason }
// Online refunds go back through Razorpay; Cash/Card/UPI are paid back at the till and only recorded here.
const refundOrder = async (req, res, next) => {
    try {
        const { orderId, method } = req.body;
        const amountPaise = Number(req.body.amountPaise);
        const reason = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 200) : "";
        const requestId = typeof req.body.requestId === "string" ? req.body.requestId.slice(0, 100) : "";
        if (!mongoose.isValidObjectId(orderId)) return next(createHttpError(404, "Order not found"));
        if (!["Cash", "Card", "UPI", "Online", "Points"].includes(method)) return next(createHttpError(400, "Pick how the money goes back"));
        if (!Number.isInteger(amountPaise) || amountPaise <= 0) return next(createHttpError(400, "Invalid refund amount"));
        if (!reason) return next(createHttpError(400, "Give a reason for the refund"));
        if (requestId.length < 8) return next(createHttpError(400, "requestId is required"));

        const viaRazorpay = method === "Online" && (async (order, amount) => {
            // Refund from the latest online payment that still has enough left on it.
            const refundedFrom = (ref) => order.refunds.filter((r) => r.paymentRef === ref).reduce((s, r) => s + r.amountPaise, 0);
            const payment = [...order.payments].reverse()
                .find((p) => p.method === "Online" && p.reference && p.amountPaise - refundedFrom(p.reference) >= amount);
            if (!payment) throw createHttpError(400, "No single online payment covers that amount; refund less or split it");
            const razorpay = new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpaySecretKey });
            try {
                const refund = await razorpay.payments.refund(payment.reference, { amount, notes: { orderNo: order.orderNo || "" } });
                return { reference: refund.id, paymentRef: payment.reference };
            } catch (error) {
                throw createHttpError(502, `Razorpay: ${error?.error?.description || "refund failed"}`);
            }
        });

        const { order, replay } = await applyRefund(orderId, { requestId, method, amountPaise, reason, user: req.user }, viaRazorpay || undefined);
        if (!replay) record(req.user, "order.refund", "order", order._id, { orderNo: order.orderNo, method, amountPaise, reason });
        res.json({ success: true, message: "Refund recorded", data: order, replay });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrder, verifyPayment, webHookVerfication, refundOrder
};