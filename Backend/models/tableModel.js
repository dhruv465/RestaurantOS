const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
    tableNo: {
        type: Number,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['Available', 'Booked', 'Reserved', 'Cleaning'],
        default: "Available"
    },
    statusSince: { type: Date, default: Date.now },
    // Floor plan: which room, and where the table sits as a % of that room's width/height.
    area: { type: String, trim: true, maxlength: 40, default: 'Main' },
    posX: { type: Number, min: 0, max: 100 },
    posY: { type: Number, min: 0, max: 100 },
     seats: {
         type: Number,
         required: true
     },
    currentOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    },
    // Guest QR ordering: the QR holds qrToken; guests also need the short code the waiter gives them.
    qrToken: { type: String, unique: true, sparse: true },
    guestCodeHash: { type: String, select: false },
    guestCodeVersion: { type: Number, default: 0 }, // bumped on every new code or table release: old guest sessions end
});

const Table = mongoose.model("Table", tableSchema);
// Use this update whenever a table is freed, so the last party's guest code stops working.
Table.FREE = { status: 'Available', currentOrder: null, $unset: { guestCodeHash: 1 }, $inc: { guestCodeVersion: 1 }, $currentDate: { statusSince: true } };
module.exports = Table;