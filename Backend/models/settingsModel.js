const mongoose = require('mongoose');

// Single restaurant: exactly one settings document, _id "restaurant".
const settingsSchema = new mongoose.Schema({
    _id: { type: String, default: 'restaurant' },
    restaurantName: { type: String, default: 'RestOS', trim: true },
    address: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    gstin: { type: String, default: '', trim: true, uppercase: true },
    taxRatePercent: { type: Number, default: 5, min: 0, max: 28 },
    taxInclusive: { type: Boolean, default: false },
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    upiVpa: { type: String, default: '', trim: true },
    upiPayeeName: { type: String, default: '', trim: true },
    // shortcut: stations are plain names; renaming one leaves items on the old name (they fall back to the first station).
    stations: { type: [String], default: ['Kitchen'] },
    // Address guests' phones open from a table QR, e.g. http://192.168.1.20:5173 or https://order.example.com
    publicBaseUrl: { type: String, default: '', trim: true },
    // Loyalty: points earned per ₹100 paid (0 = off) and what one point is worth when spent.
    loyaltyEarnPer100: { type: Number, default: 0, min: 0, max: 100 },
    loyaltyPointPaise: { type: Number, default: 100, min: 1, max: 100000 },
    // Scheduled orders go to the kitchen this many minutes before their time.
    scheduleLeadMinutes: { type: Number, default: 30, min: 0, max: 240 },
    // Self-order kiosk link secret; empty = kiosk off. Changed only through POST /api/settings/kiosk.
    kioskToken: { type: String, default: '' },
}, { timestamps: true });

settingsSchema.statics.load = function () {
    return this.findOneAndUpdate(
        { _id: 'restaurant' },
        {},
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

settingsSchema.statics.EDITABLE = [
    'restaurantName', 'address', 'phone', 'gstin', 'taxRatePercent',
    'taxInclusive', 'timezone', 'upiVpa', 'upiPayeeName', 'stations', 'publicBaseUrl', 'loyaltyEarnPer100', 'loyaltyPointPaise', 'scheduleLeadMinutes',
];

module.exports = mongoose.model('Settings', settingsSchema);
