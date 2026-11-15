const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    _id: String,
    seq: { type: Number, default: 0 },
});

const dayKey = (timezone = 'Asia/Kolkata', now = new Date()) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now).replaceAll('-', '');

// Atomic $inc, no transaction needed.
counterSchema.statics.nextSeq = async function (key) {
    const { seq } = await this.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true });
    return seq;
};

// Readable order numbers that restart daily: YYYYMMDD-0001.
counterSchema.statics.nextOrderNo = async function (timezone, now) {
    const day = dayKey(timezone, now);
    return `${day}-${String(await this.nextSeq(`order-${day}`)).padStart(4, '0')}`;
};

// Kitchen ticket numbers restart daily too: 1, 2, 3...
counterSchema.statics.nextKotNo = function (timezone, now) {
    return this.nextSeq(`kot-${dayKey(timezone, now)}`);
};

module.exports = mongoose.model('Counter', counterSchema);
