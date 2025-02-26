const mongoose = require('mongoose');
const { Schema } = mongoose;


const orderSchema = new mongoose.Schema({
    customerDetails: {
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        guests: {
            type: Number,
            required: true
        }
    },
    orderStatus: {
        type: String,
        required: true,
      
    },
    orderDate: {
        type: Date,
        default: Date.now()
    },
    bills: {
        total: { type: Number, required: true },
        tax: { type: Number, required: true },
        grandTotal: { type: Number, required: true }
    },
    items: [],
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table"},
    paymentMethod: String,
    paymentData: {
        razorpay_order_id: String,
        razorpay_payment_id: String,
    }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
