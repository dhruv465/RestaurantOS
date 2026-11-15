const mongoose = require('mongoose');

// Guests we know by phone. Phone is stored as digits only (see utils/loyalty.normalizePhone).
const customerSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, unique: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
    birthday: Date,
    allergies: { type: String, trim: true, maxlength: 300, default: '' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    marketingOptOut: { type: Boolean, default: false },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    visits: { type: Number, default: 0 },
    totalSpentPaise: { type: Number, default: 0 },
    lastVisitAt: Date,
}, { timestamps: true });
customerSchema.index({ name: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
