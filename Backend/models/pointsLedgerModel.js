const mongoose = require('mongoose');

// Every change to a customer's points, so the balance can be explained.
const pointsLedgerSchema = new mongoose.Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    orderNo: String,
    type: { type: String, enum: ['earn', 'redeem', 'reverse', 'refund', 'adjust'], required: true },
    points: { type: Number, required: true }, // + added, − taken
    balanceAfter: Number,
    requestId: String,
    note: { type: String, maxlength: 200 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
pointsLedgerSchema.index({ customer: 1, createdAt: -1 });
// One earn per order; one redeem per payment request (a retried payment can't spend twice).
pointsLedgerSchema.index({ order: 1, type: 1 }, { unique: true, partialFilterExpression: { type: 'earn' } });
pointsLedgerSchema.index({ requestId: 1, type: 1 }, { unique: true, partialFilterExpression: { type: 'redeem' } });

module.exports = mongoose.model('PointsLedger', pointsLedgerSchema);
