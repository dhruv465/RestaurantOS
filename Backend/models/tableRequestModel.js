const mongoose = require('mongoose');

// A guest tapping "Call waiter" or "Ask for bill" on the table QR page.
const tableRequestSchema = new mongoose.Schema({
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    tableNo: Number,
    type: { type: String, enum: ['waiter', 'bill'], required: true },
    status: { type: String, enum: ['Open', 'Resolved'], default: 'Open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
tableRequestSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('TableRequest', tableRequestSchema);
