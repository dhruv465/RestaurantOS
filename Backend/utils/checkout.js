// Taking money for an order. Every payment path (till, Razorpay) goes through applyPayments.
const createHttpError = require('http-errors');
const Order = require('../models/orderModel');
const Table = require('../models/tableModel');
const Kot = require('../models/kotModel');
const Settings = require('../models/settingsModel');
const { computeBills, toPaise } = require('./pricing');
const { emit } = require('./realtime');
const { pointsToPay, spendPoints, undoSpend, givePoints, onOrderPaid } = require('./loyalty');
const { deductForOrder } = require('./stock');

const TILL_METHODS = ['Cash', 'Card', 'UPI', 'Points'];

const paymentStatusFor = (paidPaise, totalPaise) =>
    paidPaise <= 0 ? 'Unpaid' : paidPaise >= totalPaise ? 'Paid' : 'Partial';

// Pure: validate till payments. Cash may be over-tendered; the rest is change.
const cleanPayments = (raw, user) => {
    if (!Array.isArray(raw)) throw createHttpError(400, 'payments must be a list');
    return raw.map((p) => {
        if (!TILL_METHODS.includes(p.method)) throw createHttpError(400, 'Payment method must be Cash, Card, UPI or Points');
        const amountPaise = Number(p.amountPaise);
        if (!Number.isInteger(amountPaise) || amountPaise <= 0) throw createHttpError(400, 'Invalid payment amount');
        let tenderedPaise = amountPaise;
        if (p.method === 'Cash' && p.tenderedPaise !== undefined) {
            tenderedPaise = Number(p.tenderedPaise);
            if (!Number.isInteger(tenderedPaise) || tenderedPaise < amountPaise) throw createHttpError(400, 'Cash given is less than the amount');
        }
        const out = { method: p.method, amountPaise, tenderedPaise, changePaise: tenderedPaise - amountPaise, by: user?._id };
        if (typeof p.reference === 'string' && p.reference.trim()) out.reference = p.reference.trim().slice(0, 100);
        return out;
    });
};

// New discount/tip from the till, keeping the delivery fee fixed when the order was placed.
const withFee = (order, adjustments) => {
    const saved = order.toObject().adjustments || {};
    if (!adjustments) return saved;
    return saved.deliveryFeePaise ? { ...adjustments, deliveryFeePaise: saved.deliveryFeePaise } : adjustments;
};

// Re-total from the order's own saved lines and tax snapshot, so a menu price change after ordering doesn't move the bill.
const billsFor = async (order, adjustments) => {
    const lines = order.items.map((l) => ({ unitPaise: l.unitPaise ?? toPaise(l.pricePerQuantity ?? l.price / l.quantity), quantity: l.quantity }));
    const tax = order.bills?.taxRatePercent !== undefined ? order.bills : await Settings.load();
    return computeBills(lines, tax, adjustments);
};

// Paid and nothing left for the kitchen to hand over (dine-in is done once paid): order is Completed.
const completeIfDone = async (orderId) => {
    const order = await Order.findById(orderId).select('paymentStatus orderStatus type delivery.status kitchenHeld');
    if (!order || order.paymentStatus !== 'Paid' || order.orderStatus === 'Completed' || order.orderStatus === 'Cancelled') return;
    if (order.kitchenHeld) return; // paid ahead; the kitchen has not even started
    if (order.type === 'Delivery' && order.delivery?.status !== 'Delivered') return;
    if (order.type !== 'Dine-in' && (await Kot.exists({ order: orderId, status: { $ne: 'Served' } }))) return;
    await Order.updateOne({ _id: orderId }, { orderStatus: 'Completed' });
    emit('order', { orderId });
};

// Adds payments (and optional new discount/tip) with a compare-and-set on paidPaise, so two tills can't both
// take the last payment. Returns { order, replay } — replay = this requestId was already applied.
const applyPayments = async (orderId, { requestId, adjustments, payments = [] }) => {
    const order = await Order.findById(orderId);
    if (!order) throw createHttpError(404, 'Order not found');
    if (requestId && order.payments.some((p) => p.requestId === requestId)) return { order, replay: true };
    if (order.paymentStatus === 'Paid') throw createHttpError(409, 'Order is already paid');
    if (order.acceptance === 'Pending') throw createHttpError(409, 'Accept or decline this guest order first');

    const nextAdjustments = withFee(order, adjustments);
    const bills = await billsFor(order, nextAdjustments);
    const paidBefore = order.paidPaise || 0;
    if (bills.totalPaise < paidBefore) throw createHttpError(400, 'That would make the bill less than what was already paid');

    const added = payments.reduce((sum, p) => sum + p.amountPaise, 0);
    if (added > bills.totalPaise - paidBefore) throw createHttpError(400, 'Payment is more than the amount due');

    // Points: take them from the customer before the order update; give them back if that update loses a race.
    const pointsPaise = payments.filter((p) => p.method === 'Points').reduce((sum, p) => sum + p.amountPaise, 0);
    let settings;
    let pointsSpent = 0;
    if (pointsPaise > 0) {
        if (!order.customer) throw createHttpError(400, 'Attach a customer to pay with points');
        settings = await Settings.load();
        pointsSpent = pointsToPay(pointsPaise, settings.loyaltyPointPaise);
        await spendPoints(order.customer, pointsSpent, { order, requestId, by: payments[0].by });
        for (const p of payments) if (p.method === 'Points') p.reference = `${pointsToPay(p.amountPaise, settings.loyaltyPointPaise)} points`;
    }

    const paidPaise = paidBefore + added;
    const paymentStatus = paymentStatusFor(paidPaise, bills.totalPaise);
    const set = { adjustments: nextAdjustments, bills, paidPaise, paymentStatus };
    if (paymentStatus === 'Paid') {
        const methods = new Set([...order.payments, ...payments].map((p) => p.method));
        set.paymentMethod = methods.size === 1 ? [...methods][0] : 'Split';
    }

    const updated = await Order.findOneAndUpdate(
        { _id: order._id, paidPaise: paidBefore || { $in: [0, null] }, paymentStatus: { $ne: 'Paid' } },
        { $set: set, $push: { payments: { $each: payments.map((p) => ({ ...p, requestId })) } } },
        { new: true, runValidators: true }
    );
    if (!updated) {
        if (pointsSpent) await undoSpend(order.customer, pointsSpent, requestId);
        const now = await Order.findById(order._id);
        if (requestId && now?.payments.some((p) => p.requestId === requestId)) return { order: now, replay: true };
        throw createHttpError(409, 'The order changed while paying; check the amount and try again');
    }

    if (paymentStatus === 'Paid') {
        if (updated.table) {
            const freed = await Table.updateOne({ _id: updated.table, currentOrder: updated._id }, Table.FREE);
            if (freed.modifiedCount) emit('table', { tableId: updated.table });
        }
        await completeIfDone(updated._id);
        await onOrderPaid(updated, settings || (await Settings.load()));
        // Stock is bookkeeping: a failure here must not turn a taken payment into an error at the till.
        await deductForOrder(updated._id).catch((error) => console.error('Stock deduction failed for', String(updated._id), error));
    }
    emit('order', { orderId: updated._id });
    return { order: (await Order.findById(updated._id)) || updated, replay: false };
};

// Pure: how much can still be refunded, overall and to the online (Razorpay) payments.
const refundable = (order) => {
    const sum = (list, method) => (list || []).filter((p) => !method || p.method === method).reduce((s, p) => s + p.amountPaise, 0);
    return {
        totalPaise: sum(order.payments) - sum(order.refunds),
        onlinePaise: sum(order.payments, 'Online') - sum(order.refunds, 'Online'),
        pointsPaise: sum(order.payments, 'Points') - sum(order.refunds, 'Points'),
    };
};

// Records a refund with a compare-and-set on refundedPaise. sendMoney runs only after the checks pass and
// before the record is written (Razorpay for online); it returns { reference, paymentRef }.
const applyRefund = async (orderId, { requestId, method, amountPaise, reason, user }, sendMoney) => {
    const order = await Order.findById(orderId);
    if (!order) throw createHttpError(404, 'Order not found');
    if (order.refunds.some((r) => r.requestId === requestId)) return { order, replay: true };

    const left = refundable(order);
    if (amountPaise > left.totalPaise) throw createHttpError(400, `Only ${(left.totalPaise / 100).toFixed(2)} can be refunded`);
    if (method === 'Online' && amountPaise > left.onlinePaise) {
        throw createHttpError(400, `Only ${(left.onlinePaise / 100).toFixed(2)} was paid online`);
    }
    if (method === 'Points' && amountPaise > left.pointsPaise) {
        throw createHttpError(400, `Only ${(left.pointsPaise / 100).toFixed(2)} was paid with points`);
    }

    const { reference, paymentRef } = sendMoney ? await sendMoney(order, amountPaise) : {};
    const refundedBefore = order.refundedPaise || 0;
    const updated = await Order.findOneAndUpdate(
        { _id: order._id, refundedPaise: refundedBefore || { $in: [0, null] } },
        {
            $set: { refundedPaise: refundedBefore + amountPaise },
            $push: { refunds: { method, amountPaise, reason, reference, paymentRef, requestId, by: user?._id } },
        },
        { new: true }
    );
    // shortcut: if this lost a race after Razorpay already refunded, the money went back but isn't recorded; the audit
    // log and Razorpay dashboard still have it. Lock the order before calling Razorpay if two managers refund at once.
    if (!updated) throw createHttpError(409, 'The order changed while refunding; reload and check before trying again');
    if (method === 'Points' && order.customer) {
        const { loyaltyPointPaise } = await Settings.load();
        await givePoints(order.customer, Math.floor(amountPaise / loyaltyPointPaise), { type: 'refund', order, requestId, by: user?._id, note: reason });
    }
    emit('order', { orderId: order._id });
    return { order: updated, replay: false, reference };
};

module.exports = { refundable, applyRefund, paymentStatusFor, cleanPayments, billsFor, withFee, applyPayments, completeIfDone };
