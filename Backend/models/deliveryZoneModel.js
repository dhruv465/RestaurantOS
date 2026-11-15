const mongoose = require('mongoose');

// A named area the restaurant delivers to, with its own fee and minimum order (food subtotal).
const deliveryZoneSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 60, unique: true },
    feePaise: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    minOrderPaise: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    etaMinutes: { type: Number, default: 30, min: 0, max: 600 },
    active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);
