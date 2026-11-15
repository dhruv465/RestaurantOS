const mongoose = require('mongoose');
const { Schema } = mongoose;


const orderSchema = new mongoose.Schema({
    customerDetails: {
        name: {
            type: String,
            required: true
        },
        phone: { type: String, default: '' }, // walk-in dine-in guests often give none; delivery checks it in the controller
        guests: {
            type: Number,
            required: true
        }
    },
    orderNo: { type: String, unique: true, sparse: true },
    clientRequestId: { type: String, unique: true, sparse: true }, // a retried "send" returns the first order
    type: { type: String, enum: ['Dine-in', 'Takeaway', 'Delivery'], default: 'Dine-in' },
    channel: { type: String, enum: ['POS', 'QR', 'Kiosk'], default: 'POS' },
    // Guest (QR) orders wait for staff to accept before the kitchen sees them.
    acceptance: { type: String, enum: ['Accepted', 'Pending', 'Declined'], default: 'Accepted' },
    guestSession: Number, // table.guestCodeVersion the guest ordered under
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    stockDeducted: Boolean, // recipe stock taken for this order (once, when it was paid)
    orderStatus: {
        type: String,
        required: true,
        enum: ['In Progress', 'Ready', 'Completed', 'Cancelled'],
        default: 'In Progress'
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    // Paise fields are the source of truth (set by utils/pricing.js). Rupee fields are display copies.
    bills: {
        subtotalPaise: Number,
        taxPaise: Number,
        totalPaise: Number,
        discountPaise: Number,
        tipPaise: Number,
        deliveryFeePaise: Number,
        taxRatePercent: Number,
        taxInclusive: Boolean,
        total: { type: Number, required: true },
        tax: { type: Number, required: true },
        grandTotal: { type: Number, required: true }
    },
    items: [],
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table"},
    // Discount/tip chosen at checkout; utils/pricing.js#cleanAdjustments validates them.
    adjustments: {
        discountType: { type: String, enum: ['percent', 'flat'] },
        discountValue: Number, // percent, or paise when flat
        discountReason: String,
        tipPaise: Number,
        deliveryFeePaise: Number, // set from the zone when a delivery order is created; never from the client
    },
    payments: [{
        _id: false,
        method: { type: String, enum: ['Cash', 'Card', 'UPI', 'Online', 'Points'], required: true },
        amountPaise: { type: Number, required: true },
        tenderedPaise: Number,
        changePaise: Number,
        reference: String,
        requestId: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
    }],
    paidPaise: { type: Number, default: 0 },
    refunds: [{
        _id: false,
        method: { type: String, enum: ['Cash', 'Card', 'UPI', 'Online', 'Points'], required: true },
        amountPaise: { type: Number, required: true },
        reason: String,
        reference: String, // Razorpay refund id for online refunds
        paymentRef: String, // which Razorpay payment it was refunded from
        requestId: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
    }],
    refundedPaise: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['Unpaid', 'Partial', 'Paid'], default: 'Unpaid' },
    // Summary for old screens: the one method used, or "Split". Set when fully paid.
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'UPI', 'Online', 'Points', 'Split'] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancel: {
        reason: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: Date,
        mergedInto: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    },
    delivery: {
        zone: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone' },
        zoneName: String,
        address: { type: String, maxlength: 300 },
        note: { type: String, maxlength: 200 },
        status: { type: String, enum: ['Waiting', 'Assigned', 'Out', 'Delivered', 'Failed'] },
        rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        riderName: String,
        assignedAt: Date,
        outAt: Date,
        doneAt: Date,
        failReason: { type: String, maxlength: 200 },
    },
    // Takeaway/delivery for later: the kitchen gets it leadMinutes before this time (utils/scheduler.js).
    scheduledFor: Date,
    kitchenHeld: Boolean, // true until the scheduler sends it to the kitchen
    paymentData: {
        razorpay_order_id: String,
        razorpay_payment_id: String,
        amountPaise: Number, // what the Razorpay order was created for
    }
}, { timestamps: true });

orderSchema.index({ 'delivery.status': 1, createdAt: -1 });
orderSchema.index({ kitchenHeld: 1, scheduledFor: 1 }, { partialFilterExpression: { kitchenHeld: true } });

module.exports = mongoose.model("Order", orderSchema);
