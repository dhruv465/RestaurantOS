const mongoose = require('mongoose');

const KOT_STATUSES = ['New', 'Preparing', 'Ready', 'Served'];

// One kitchen ticket per station per "send to kitchen". quantity < 0 means "cancel this many".
const kotSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNo: String,
    ticketNo: { type: Number, required: true },
    station: { type: String, required: true },
    orderType: String,
    tableNo: Number,
    status: { type: String, enum: KOT_STATUSES, default: 'New' },
    isPriority: { type: Boolean, default: false },
    prepMinutes: Number, // longest prep time on the ticket; the kitchen screen warns after it
    items: [{
        _id: false,
        lineId: mongoose.Schema.Types.Mixed,
        name: String,
        quantity: Number, // < 0 cancel, 0 = note changed
        instructions: String,
        modifiers: [String],
    }],
    statusAt: { Preparing: Date, Ready: Date, Served: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

kotSchema.index({ status: 1, createdAt: -1 });
kotSchema.index({ order: 1 });

const Kot = mongoose.model('Kot', kotSchema);
Kot.STATUSES = KOT_STATUSES;
module.exports = Kot;
