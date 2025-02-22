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
        required: true
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },
    bills: {
        total: { type: Number, required: true },
        tax: { type: Number, required: true },
        grandTotal: { type: Number, required: true }
    },
    items: [],
    table: {
        type: Schema.Types.ObjectId,
        ref: "Table"
    }

}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;