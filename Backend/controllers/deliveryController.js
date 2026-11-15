// Delivery: zones (fee + minimum), the dispatch board, rider assignment and the rider's own list.
const createHttpError = require('http-errors');
const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const DeliveryZone = require('../models/deliveryZoneModel');
const { can, ROLES } = require('../config/permissions');
const { completeIfDone } = require('../utils/checkout');
const { record } = require('../utils/audit');
const { emit } = require('../utils/realtime');

const handle = (fn) => (req, res, next) => fn(req, res).catch(next);
const idOk = (id, what) => {
    if (!mongoose.isValidObjectId(id)) throw createHttpError(404, `${what} not found`);
};
const paise = (v, what) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) throw createHttpError(400, `${what} must be whole paise, 0 or more`);
    return n;
};
const RIDER_ROLES = Object.keys(ROLES).filter((r) => ROLES[r].includes('delivery.rider'));
const BOARD_FIELDS = 'orderNo customerDetails delivery bills.totalPaise bills.deliveryFeePaise paidPaise paymentStatus scheduledFor kitchenHeld orderStatus createdAt items.name items.quantity';

// Rider moves: Assigned → Out → Delivered | Failed. Managers may also send it back to Waiting.
const NEXT = { Assigned: ['Out', 'Waiting'], Out: ['Delivered', 'Failed'], Waiting: [], Delivered: [], Failed: [] };

// ---------- Zones ----------
const listZones = handle(async (req, res) => {
    const filter = req.query.all && can(req.user, 'delivery.manage') ? {} : { active: true };
    res.json({ success: true, data: await DeliveryZone.find(filter).sort({ name: 1 }) });
});

const cleanZone = (b, partial) => {
    const out = {};
    if (!partial || b.name !== undefined) {
        const name = typeof b.name === 'string' ? b.name.trim().slice(0, 60) : '';
        if (!name) throw createHttpError(400, 'Zone name is required');
        out.name = name;
    }
    if (b.feePaise !== undefined) out.feePaise = paise(b.feePaise, 'Fee');
    if (b.minOrderPaise !== undefined) out.minOrderPaise = paise(b.minOrderPaise, 'Minimum order');
    if (b.etaMinutes !== undefined) out.etaMinutes = Math.min(600, paise(b.etaMinutes, 'Delivery time'));
    if (b.active !== undefined) out.active = b.active === true;
    return out;
};

const saveZone = handle(async (req, res) => {
    const id = req.params.id;
    if (id) idOk(id, 'Zone');
    try {
        const zone = id
            ? await DeliveryZone.findByIdAndUpdate(id, cleanZone(req.body, true), { new: true, runValidators: true })
            : await DeliveryZone.create(cleanZone(req.body, false));
        if (!zone) throw createHttpError(404, 'Zone not found');
        record(req.user, id ? 'zone.update' : 'zone.create', 'deliveryZone', zone._id, { name: zone.name, feePaise: zone.feePaise });
        res.status(id ? 200 : 201).json({ success: true, data: zone });
    } catch (e) {
        if (e.code === 11000) throw createHttpError(409, 'A zone with that name already exists');
        throw e;
    }
});

// ---------- Board ----------
const board = handle(async (req, res) => {
    const since = new Date(Date.now() - 12 * 3600000);
    const [orders, riders] = await Promise.all([
        Order.find({
            type: 'Delivery',
            orderStatus: { $ne: 'Cancelled' },
            $or: [{ 'delivery.status': { $in: ['Waiting', 'Assigned', 'Out'] } }, { 'delivery.doneAt': { $gte: since } }],
        }).select(BOARD_FIELDS).sort({ createdAt: 1 }).limit(200).lean(),
        User.find({ role: { $in: RIDER_ROLES }, active: { $ne: false } }).select('name').sort({ name: 1 }).lean(),
    ]);
    res.json({ success: true, data: { orders, riders } });
});

// POST /api/delivery/:orderId/assign { riderId } — riderId null takes it back off the rider.
const assign = handle(async (req, res) => {
    idOk(req.params.orderId, 'Order');
    let set;
    if (req.body.riderId) {
        idOk(req.body.riderId, 'Rider');
        const rider = await User.findOne({ _id: req.body.riderId, role: { $in: RIDER_ROLES }, active: { $ne: false } }).select('name');
        if (!rider) throw createHttpError(400, 'That person is not an active rider');
        set = { 'delivery.status': 'Assigned', 'delivery.rider': rider._id, 'delivery.riderName': rider.name, 'delivery.assignedAt': new Date() };
    } else {
        set = { 'delivery.status': 'Waiting', 'delivery.rider': null, 'delivery.riderName': null };
    }
    // Only before the food has left: once Out, the rider has it.
    const order = await Order.findOneAndUpdate(
        { _id: req.params.orderId, type: 'Delivery', orderStatus: { $ne: 'Cancelled' }, 'delivery.status': { $in: ['Waiting', 'Assigned'] } },
        { $set: set },
        { new: true }
    ).select(BOARD_FIELDS);
    if (!order) throw createHttpError(409, 'This delivery has already left or was cancelled');
    record(req.user, 'delivery.assign', 'order', order._id, { orderNo: order.orderNo, rider: set['delivery.riderName'] });
    emit('delivery');
    res.json({ success: true, data: order });
});

// POST /api/delivery/:orderId/status { from, to, reason? }
const setStatus = handle(async (req, res) => {
    idOk(req.params.orderId, 'Order');
    const { from, to } = req.body;
    if (!NEXT[from]?.includes(to)) throw createHttpError(400, `Cannot go from ${from} to ${to}`);
    const manager = can(req.user, 'delivery.manage');
    if (to === 'Waiting' && !manager) throw createHttpError(403, 'Ask the manager to take it off you');
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 200) : '';
    if (to === 'Failed' && !reason) throw createHttpError(400, 'Say why the delivery failed');

    const filter = { _id: req.params.orderId, type: 'Delivery', 'delivery.status': from };
    if (!manager) filter['delivery.rider'] = req.user._id;
    const set = { 'delivery.status': to };
    if (to === 'Out') set['delivery.outAt'] = new Date();
    if (to === 'Delivered' || to === 'Failed') set['delivery.doneAt'] = new Date();
    if (to === 'Failed') set['delivery.failReason'] = reason;
    if (to === 'Waiting') Object.assign(set, { 'delivery.rider': null, 'delivery.riderName': null });
    const order = await Order.findOneAndUpdate(filter, { $set: set }, { new: true }).select(BOARD_FIELDS);
    if (!order) throw createHttpError(409, 'This delivery changed. Refresh and try again.');
    if (to === 'Delivered') await completeIfDone(order._id);
    record(req.user, 'delivery.status', 'order', order._id, { orderNo: order.orderNo, from, to, reason: reason || undefined });
    emit('delivery');
    emit('order', { orderId: order._id });
    res.json({ success: true, data: order });
});

// GET /api/delivery/mine — the rider's current runs plus today's finished ones.
const mine = handle(async (req, res) => {
    const since = new Date(Date.now() - 12 * 3600000);
    const orders = await Order.find({
        'delivery.rider': req.user._id,
        orderStatus: { $ne: 'Cancelled' },
        $or: [{ 'delivery.status': { $in: ['Assigned', 'Out'] } }, { 'delivery.doneAt': { $gte: since } }],
    }).select(BOARD_FIELDS).sort({ 'delivery.assignedAt': 1 }).lean();
    res.json({ success: true, data: orders });
});

module.exports = { listZones, saveZone, board, assign, setStatus, mine };
