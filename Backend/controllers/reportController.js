const createHttpError = require('http-errors');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Settings = require('../models/settingsModel');
const { dayRange } = require('../utils/dates');
const { summarize, localParts } = require('../utils/reports');
const Table = require('../models/tableModel');
const Kot = require('../models/kotModel');

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 92;

// GET /api/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD (both inclusive, restaurant's local days)
// shortcut: sums in Node over at most ~3 months of orders; switch to a Mongo $group pipeline if volume makes this slow.
const salesReport = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        if (!DAY.test(from || '') || !DAY.test(to || '')) return next(createHttpError(400, 'from and to must be YYYY-MM-DD'));
        const { timezone } = await Settings.load();
        const [start] = dayRange(from, timezone);
        const [, end] = dayRange(to, timezone);
        if (end <= start) return next(createHttpError(400, 'to must be on or after from'));
        if (end - start > MAX_DAYS * 86400000) return next(createHttpError(400, `Pick at most ${MAX_DAYS} days`));

        const [orders, staff] = await Promise.all([
            Order.find({ createdAt: { $gte: start, $lt: end } })
                .select('orderStatus paymentStatus type createdAt createdBy bills adjustments items.name items.quantity items.unitPaise items.price paymentMethod payments.method payments.amountPaise refunds.method refunds.amountPaise cancel')
                .lean(),
            User.find().select('name').lean(),
        ]);
        const names = Object.fromEntries(staff.map((u) => [String(u._id), u.name]));
        res.status(200).json({ success: true, data: { from, to, timezone, ...summarize(orders, timezone, names) } });
    } catch (error) {
        next(error);
    }
};

const SALES_FIELDS = 'orderStatus paymentStatus type channel createdAt createdBy bills adjustments items.name items.quantity items.unitPaise items.price paymentMethod payments.method payments.amountPaise refunds.method refunds.amountPaise cancel';
const shiftDay = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// GET /api/reports/dashboard — today vs yesterday, 14-day trend, what is live on the floor right now.
const dashboard = async (req, res, next) => {
    try {
        const { timezone } = await Settings.load();
        const today = localParts(new Date(), timezone).day;
        const [trendStart] = dayRange(shiftDay(today, -13), timezone);
        const [yStart, todayStart] = dayRange(shiftDay(today, -1), timezone);
        const [orders, tables, kitchen, openOrders, pendingGuest] = await Promise.all([
            Order.find({ createdAt: { $gte: trendStart } }).select(SALES_FIELDS).lean(),
            Table.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Kot.aggregate([{ $match: { status: { $in: ['New', 'Preparing', 'Ready'] } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
            Order.countDocuments({ orderStatus: { $nin: ['Completed', 'Cancelled'] }, acceptance: { $ne: 'Pending' } }),
            Order.countDocuments({ acceptance: 'Pending', orderStatus: { $ne: 'Cancelled' } }),
        ]);
        const at = (o) => new Date(o.createdAt).getTime();
        const todays = summarize(orders.filter((o) => at(o) >= todayStart.getTime()), timezone);
        const yesterday = summarize(orders.filter((o) => at(o) >= yStart.getTime() && at(o) < todayStart.getTime()), timezone).totals;
        const trend = summarize(orders, timezone).byDay;
        const days = Array.from({ length: 14 }, (_, i) => shiftDay(today, i - 13));
        const byDay = Object.fromEntries(trend.map((d) => [d.key, d]));
        const qr = orders.filter((o) => at(o) >= todayStart.getTime() && o.channel === 'QR' && o.paymentStatus === 'Paid').length;
        res.json({
            success: true,
            data: {
                today,
                timezone,
                totals: todays.totals,
                yesterday,
                trend: days.map((d) => ({ key: d, orders: byDay[d]?.orders || 0, totalPaise: byDay[d]?.totalPaise || 0 })),
                topItems: todays.byItem.slice(0, 5),
                byType: todays.byType,
                byMethod: todays.byMethod,
                qrOrders: qr,
                tables: Object.fromEntries(tables.map((t) => [t._id, t.count])),
                kitchen: Object.fromEntries(kitchen.map((k) => [k._id, k.count])),
                openOrders,
                pendingGuest,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { salesReport, dashboard };
