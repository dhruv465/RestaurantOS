// Sends scheduled orders to the kitchen when their time comes (scheduledFor − settings.scheduleLeadMinutes).
const Order = require('../models/orderModel');
const Settings = require('../models/settingsModel');
const { sendToKitchen } = require('./kitchen');
const { emit } = require('./realtime');

// Claim with a compare-and-set so two servers (or a manual "send now") never send the same order twice.
const release = async (orderId) => {
    const claimed = await Order.findOneAndUpdate({ _id: orderId, kitchenHeld: true, orderStatus: { $ne: 'Cancelled' } }, { $unset: { kitchenHeld: 1 } }, { new: true });
    if (!claimed) return null;
    await sendToKitchen(claimed, [], null);
    emit('order', { orderId: claimed._id });
    return claimed;
};

const releaseDue = async () => {
    const { scheduleLeadMinutes = 30 } = await Settings.load();
    const due = await Order.find({ kitchenHeld: true, orderStatus: { $ne: 'Cancelled' }, scheduledFor: { $lte: new Date(Date.now() + scheduleLeadMinutes * 60000) } }).select('_id').lean();
    for (const o of due) await release(o._id);
    return due.length;
};

const start = (everyMs = 60000) => {
    const tick = () => releaseDue().catch((e) => console.error('scheduler:', e.message));
    tick();
    return setInterval(tick, everyMs);
};

module.exports = { release, releaseDue, start };
