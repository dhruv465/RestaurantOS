// Customers and loyalty points. Points are whole numbers; settings say what they are worth.
const createHttpError = require('http-errors');
const Customer = require('../models/customerModel');
const PointsLedger = require('../models/pointsLedgerModel');

// Pure: digits only; an Indian number written with +91 or a leading 0 becomes its 10 digits.
const normalizePhone = (raw) => {
    const digits = String(raw ?? '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits;
};
// Pure: points needed to pay amountPaise (rounded up, so points never under-pay).
const pointsToPay = (amountPaise, pointPaise) => Math.ceil(amountPaise / pointPaise);
// Pure: points earned on paidPaise at earnPer100 points per ₹100.
const pointsEarned = (paidPaise, earnPer100) => Math.floor((paidPaise * earnPer100) / 10000);

// Find the customer with this phone, or create one. Returns null when the phone isn't a usable number.
const findOrCreateByPhone = async ({ name, phone }) => {
    const digits = normalizePhone(phone);
    if (digits.length < 10 || digits.length > 13) return null;
    return Customer.findOneAndUpdate(
        { phone: digits },
        { $setOnInsert: { phone: digits, name: String(name || '').trim().slice(0, 80) || 'Guest' } },
        { upsert: true, new: true }
    );
};

const change = async (customerId, points) => {
    const filter = { _id: customerId, ...(points < 0 && { loyaltyPoints: { $gte: -points } }) };
    const customer = await Customer.findOneAndUpdate(filter, { $inc: { loyaltyPoints: points } }, { new: true });
    return customer;
};

// Take points for a payment. The ledger row goes in first: its unique requestId stops a retried request spending twice.
const spendPoints = async (customerId, points, { order, requestId, by }) => {
    let row;
    try {
        row = await PointsLedger.create({ customer: customerId, order: order._id, orderNo: order.orderNo, type: 'redeem', points: -points, requestId, by });
    } catch (error) {
        if (error.code === 11000) throw createHttpError(409, 'This payment is already being processed');
        throw error;
    }
    const customer = await change(customerId, -points);
    if (!customer) {
        await PointsLedger.deleteOne({ _id: row._id });
        throw createHttpError(400, 'Not enough points');
    }
    await PointsLedger.updateOne({ _id: row._id }, { balanceAfter: customer.loyaltyPoints });
    return customer;
};

// The payment that spent these points failed: put them back and drop the row, so a retry with the same requestId works.
const undoSpend = async (customerId, points, requestId) => {
    await Customer.updateOne({ _id: customerId }, { $inc: { loyaltyPoints: points } });
    await PointsLedger.deleteOne({ requestId, type: 'redeem' });
};

const givePoints = async (customerId, points, { type, order, requestId, by, note }) => {
    const customer = await change(customerId, points);
    if (!customer) throw createHttpError(404, 'Customer not found');
    await PointsLedger.create({
        customer: customerId, order: order?._id, orderNo: order?.orderNo, type, points, requestId, by, note, balanceAfter: customer.loyaltyPoints,
    });
    return customer;
};

// Fully paid order: count the visit and add earned points (once per order; the earn row is unique per order).
const onOrderPaid = async (order, settings) => {
    if (!order.customer) return;
    const pointsPaid = order.payments.filter((p) => p.method === 'Points').reduce((s, p) => s + p.amountPaise, 0);
    const earned = settings.loyaltyEarnPer100 > 0 ? pointsEarned(order.bills.totalPaise - pointsPaid, settings.loyaltyEarnPer100) : 0;
    try {
        await PointsLedger.create({ customer: order.customer, order: order._id, orderNo: order.orderNo, type: 'earn', points: earned });
    } catch (error) {
        if (error.code === 11000) return; // already counted
        throw error;
    }
    const customer = await Customer.findByIdAndUpdate(
        order.customer,
        { $inc: { loyaltyPoints: earned, visits: 1, totalSpentPaise: order.bills.totalPaise }, lastVisitAt: new Date() },
        { new: true }
    );
    if (customer) await PointsLedger.updateOne({ order: order._id, type: 'earn' }, { balanceAfter: customer.loyaltyPoints });
};

module.exports = { normalizePhone, pointsToPay, pointsEarned, findOrCreateByPhone, spendPoints, undoSpend, givePoints, onOrderPaid };
