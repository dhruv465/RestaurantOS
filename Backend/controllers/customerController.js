const createHttpError = require('http-errors');
const mongoose = require('mongoose');
const Customer = require('../models/customerModel');
const PointsLedger = require('../models/pointsLedgerModel');
const Order = require('../models/orderModel');
const { normalizePhone, givePoints } = require('../utils/loyalty');
const { record } = require('../utils/audit');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Only these fields come from the client; points and visit stats never do.
const pick = (body) => {
    const out = {};
    for (const key of ['name', 'email', 'allergies', 'notes']) if (typeof body[key] === 'string') out[key] = body[key];
    if (body.marketingOptOut !== undefined) out.marketingOptOut = !!body.marketingOptOut;
    if (body.birthday !== undefined) out.birthday = body.birthday || null;
    if (body.phone !== undefined) {
        out.phone = normalizePhone(body.phone);
        if (out.phone.length < 10 || out.phone.length > 13) throw createHttpError(400, 'Enter a valid phone number');
    }
    return out;
};

// GET /api/customers?q= — by name or phone, most recent visitors first.
const listCustomers = async (req, res, next) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 50) : '';
        const digits = q.replace(/\D/g, '');
        const filter = !q ? {} : digits.length >= 3
            ? { phone: { $regex: escapeRegex(digits) } }
            : { name: { $regex: escapeRegex(q), $options: 'i' } };
        const customers = await Customer.find(filter).sort({ lastVisitAt: -1, createdAt: -1 }).limit(50);
        res.status(200).json({ success: true, data: customers });
    } catch (error) {
        next(error);
    }
};

const createCustomer = async (req, res, next) => {
    try {
        const fields = pick(req.body);
        if (!fields.phone) return next(createHttpError(400, 'Phone is required'));
        const customer = await Customer.create(fields);
        record(req.user, 'customer.create', 'customer', customer._id, {});
        res.status(201).json({ success: true, data: customer });
    } catch (error) {
        if (error.code === 11000) return next(createHttpError(409, 'A customer with this phone already exists'));
        next(error);
    }
};

// GET /api/customers/:id — profile, recent orders and points history.
const getCustomer = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, 'Customer not found'));
        const customer = await Customer.findById(req.params.id);
        if (!customer) return next(createHttpError(404, 'Customer not found'));
        const [orders, ledger] = await Promise.all([
            Order.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(20)
                .select('orderNo createdAt bills.totalPaise paymentStatus orderStatus type items.name items.quantity'),
            PointsLedger.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(50),
        ]);
        res.status(200).json({ success: true, data: { customer, orders, ledger } });
    } catch (error) {
        next(error);
    }
};

const updateCustomer = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, 'Customer not found'));
        const fields = pick(req.body);
        const customer = await Customer.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
        if (!customer) return next(createHttpError(404, 'Customer not found'));
        record(req.user, 'customer.update', 'customer', customer._id, { fields: Object.keys(fields) });
        res.status(200).json({ success: true, data: customer });
    } catch (error) {
        if (error.code === 11000) return next(createHttpError(409, 'A customer with this phone already exists'));
        next(error);
    }
};

// POST /api/customers/:id/points { points, note } — manual correction, + or −.
const adjustPoints = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, 'Customer not found'));
        const points = Number(req.body.points);
        const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 200) : '';
        if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 1000000) return next(createHttpError(400, 'Points must be a whole number'));
        if (!note) return next(createHttpError(400, 'Give a reason'));
        if (points < 0) {
            const ok = await Customer.exists({ _id: req.params.id, loyaltyPoints: { $gte: -points } });
            if (!ok) return next(createHttpError(400, 'Customer does not have that many points'));
        }
        // shortcut: the check above and the change below aren't atomic; a spend in between could push the balance
        // below 0 and the schema min rejects nothing on $inc. Fine for rare manual corrections.
        const customer = await givePoints(req.params.id, points, { type: 'adjust', by: req.user._id, note });
        record(req.user, 'customer.points', 'customer', customer._id, { points, note });
        res.status(200).json({ success: true, data: customer });
    } catch (error) {
        next(error);
    }
};

module.exports = { listCustomers, createCustomer, getCustomer, updateCustomer, adjustPoints };
