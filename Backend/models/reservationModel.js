const mongoose = require('mongoose');

const phone = { type: String, trim: true, maxlength: 20 };

const reservationSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone,
    partySize: { type: Number, required: true, min: 1, max: 100 },
    at: { type: Date, required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    notes: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ['Booked', 'Seated', 'Cancelled', 'No-show'], default: 'Booked' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
reservationSchema.index({ at: 1 });

// Walk-ins waiting for a table, in arrival order.
const waitlistSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone,
    partySize: { type: Number, required: true, min: 1, max: 100 },
    quotedMinutes: { type: Number, min: 0, max: 300 },
    status: { type: String, enum: ['Waiting', 'Seated', 'Left'], default: 'Waiting' },
}, { timestamps: true });

module.exports = {
    Reservation: mongoose.model('Reservation', reservationSchema),
    Waitlist: mongoose.model('Waitlist', waitlistSchema),
};
