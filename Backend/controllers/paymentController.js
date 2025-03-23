const Razorpay = require("razorpay");
const config = require("../config/config");
const crypto = require("crypto");
const Payment = require("../models/paymentModel");
const createHttpError = require("http-errors");
const Order = require("../models/orderModel");

const createOrder = async (req, res, next) => {
    const razorpay = new Razorpay({
        key_id: config.razorpayKeyId,
        key_secret: config.razorpaySecretKey,
    });

    try {
        const { amount } = req.body;

        const options = {
            amount: amount * 100, // Amount in paisa (1 INR = 100 paisa)
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
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
            const order = await Order.findById(orderId);
            if (!order) return next(createHttpError(404, "Order not found"));

            // Update the order with payment details
            order.paymentData = {
                razorpay_order_id,
                razorpay_payment_id,
            };
            order.paymentMethod = "Online";
            await order.save();

            // Check if payment already exists before creating a new one
            const existingPayment = await Payment.findOne({ paymentId: razorpay_payment_id });
            if (!existingPayment) {
                // Create a new payment record
                const newPayment = new Payment({
                    paymentId: razorpay_payment_id,
                    orderId: orderId,
                    amount: order.bills?.grandTotal || 0,
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
                order: order
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

module.exports = {
    createOrder, verifyPayment, webHookVerfication
};