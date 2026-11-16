// Back office: expenses, daily cash close, P&L and GST summary.
const createHttpError = require('http-errors');
const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const Settings = require('../models/settingsModel');
const { Expense, CashClosing, EXPENSE_CATEGORIES, EXPENSE_METHODS, STOCK_CATEGORY } = require('../models/accountingModels');
const { PayrollRun } = require('../models/hrModels');
const { StockMovement } = require('../models/inventoryModels');
const { dayRange } = require('../utils/dates');
const { summarize, localParts } = require('../utils/reports');
const { cashFlow, expectedCash, gstByRate, payrollCost, stockCost, profitAndLoss } = require('../utils/accounting');
const { record } = require('../utils/audit');

const handle = (fn) => (req, res, next) => fn(req, res).catch(next);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const paise = (v, what) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) throw createHttpError(400, `${what} must be a whole number of paise, 0 or more`);
    return n;
};
const range = async (from, to, maxDays = 92) => {
    if (!DAY.test(from || '') || !DAY.test(to || '')) throw createHttpError(400, 'from and to must be YYYY-MM-DD');
    const { timezone } = await Settings.load();
    const [start] = dayRange(from, timezone);
    const [, end] = dayRange(to, timezone);
    if (end <= start) throw createHttpError(400, 'to must be on or after from');
    if (end - start > maxDays * 86400000) throw createHttpError(400, `Pick at most ${maxDays} days`);
    return { start, end, timezone };
};

// ---------- Expenses ----------
const cleanExpense = (b, partial = false) => {
    const out = {};
    if (!partial || b.day !== undefined) {
        if (!DAY.test(b.day || '')) throw createHttpError(400, 'Date must be YYYY-MM-DD');
        out.day = b.day;
    }
    if (!partial || b.category !== undefined) {
        if (!EXPENSE_CATEGORIES.includes(b.category)) throw createHttpError(400, `Category must be one of: ${EXPENSE_CATEGORIES.join(', ')}`);
        out.category = b.category;
    }
    if (!partial || b.amountPaise !== undefined) {
        out.amountPaise = paise(b.amountPaise, 'Amount');
        if (out.amountPaise === 0) throw createHttpError(400, 'Amount must be more than 0');
    }
    if (!partial || b.method !== undefined) {
        if (!EXPENSE_METHODS.includes(b.method)) throw createHttpError(400, `Paid by must be one of: ${EXPENSE_METHODS.join(', ')}`);
        out.method = b.method;
    }
    if (b.fromTill !== undefined || !partial) out.fromTill = b.fromTill === true;
    if (b.note !== undefined) out.note = typeof b.note === 'string' ? b.note.slice(0, 200) : '';
    return out;
};
// Till cash on a closed day is settled; changing it would make the closing wrong.
const assertOpen = async (exp) => {
    if (exp.fromTill && (await CashClosing.exists({ day: exp.day }))) throw createHttpError(409, `Cash for ${exp.day} is already closed`);
};

const listExpenses = handle(async (req, res) => {
    const { from, to } = req.query;
    if (!DAY.test(from || '') || !DAY.test(to || '')) throw createHttpError(400, 'from and to must be YYYY-MM-DD');
    const list = await Expense.find({ day: { $gte: from, $lte: to } }).sort({ day: -1, createdAt: -1 }).limit(500).populate('by', 'name');
    res.json({ success: true, data: list, categories: EXPENSE_CATEGORIES, methods: EXPENSE_METHODS });
});

const addExpense = handle(async (req, res) => {
    const fields = cleanExpense(req.body);
    if (fields.fromTill && fields.method !== 'Cash') throw createHttpError(400, 'Only cash can come from the till');
    await assertOpen(fields);
    const exp = await Expense.create({ ...fields, by: req.user._id });
    record(req.user, 'expense.add', 'expense', exp._id, { amountPaise: exp.amountPaise, category: exp.category });
    res.status(201).json({ success: true, data: exp });
});

const findExpense = async (id) => {
    if (!mongoose.isValidObjectId(id)) throw createHttpError(404, 'Expense not found');
    const exp = await Expense.findById(id);
    if (!exp) throw createHttpError(404, 'Expense not found');
    if (exp.category === STOCK_CATEGORY) throw createHttpError(409, 'This came from Inventory → Stock received. Correct the stock there.');
    return exp;
};

const editExpense = handle(async (req, res) => {
    const exp = await findExpense(req.params.id);
    await assertOpen(exp);
    const fields = cleanExpense(req.body, true);
    const next = { ...exp.toObject(), ...fields };
    if (next.fromTill && next.method !== 'Cash') throw createHttpError(400, 'Only cash can come from the till');
    await assertOpen(next);
    exp.set(fields);
    await exp.save();
    record(req.user, 'expense.edit', 'expense', exp._id, fields);
    res.json({ success: true, data: exp });
});

const deleteExpense = handle(async (req, res) => {
    const exp = await findExpense(req.params.id);
    await assertOpen(exp);
    await exp.deleteOne();
    record(req.user, 'expense.delete', 'expense', exp._id, { amountPaise: exp.amountPaise, category: exp.category, day: exp.day });
    res.json({ success: true });
});

// ---------- Cash close ----------
const computeClosing = async (day, openingFloatPaise) => {
    if (!DAY.test(day || '')) throw createHttpError(400, 'Date must be YYYY-MM-DD');
    const { timezone } = await Settings.load();
    const [start, end] = dayRange(day, timezone);
    const [orders, tillExpenses] = await Promise.all([
        Order.find({ $or: [{ 'payments.at': { $gte: start, $lt: end } }, { 'refunds.at': { $gte: start, $lt: end } }] }).select('payments refunds').lean(),
        Expense.find({ day, fromTill: true }).select('amountPaise').lean(),
    ]);
    const flow = cashFlow(orders, start, end);
    const tillExpensesPaise = tillExpenses.reduce((s, e) => s + e.amountPaise, 0);
    const parts = { openingFloatPaise, ...flow, tillExpensesPaise };
    return { day, today: localParts(new Date(), timezone).day, ...parts, expectedPaise: expectedCash(parts) };
};

// GET /api/accounting/closing/preview?day=YYYY-MM-DD&openingFloatPaise=N
const closingPreview = handle(async (req, res) => {
    const preview = await computeClosing(req.query.day, paise(req.query.openingFloatPaise ?? 0, 'Opening float'));
    const [existing, last] = await Promise.all([
        CashClosing.findOne({ day: preview.day }).populate('by', 'name'),
        CashClosing.findOne({ day: { $lt: preview.day } }).sort({ day: -1 }).select('day countedPaise'),
    ]);
    res.json({ success: true, data: { ...preview, closed: existing, previous: last } });
});

const closeDay = handle(async (req, res) => {
    const preview = await computeClosing(req.body.day, paise(req.body.openingFloatPaise, 'Opening float'));
    if (preview.day > preview.today) throw createHttpError(400, 'You cannot close a day that has not happened yet');
    const countedPaise = paise(req.body.countedPaise, 'Counted cash');
    const variancePaise = countedPaise - preview.expectedPaise;
    if (variancePaise !== 0 && !String(req.body.note || '').trim()) throw createHttpError(400, 'The count does not match. Add a note saying why.');
    const { today, ...fields } = preview;
    try {
        const closing = await CashClosing.create({ ...fields, countedPaise, variancePaise, note: String(req.body.note || '').slice(0, 300), by: req.user._id });
        record(req.user, 'cash.close', 'cashClosing', closing._id, { day: closing.day, variancePaise });
        res.status(201).json({ success: true, data: closing });
    } catch (e) {
        if (e.code === 11000) throw createHttpError(409, `${preview.day} is already closed`);
        throw e;
    }
});

const listClosings = handle(async (req, res) => {
    const { from, to } = req.query;
    if (!DAY.test(from || '') || !DAY.test(to || '')) throw createHttpError(400, 'from and to must be YYYY-MM-DD');
    res.json({ success: true, data: await CashClosing.find({ day: { $gte: from, $lte: to } }).sort({ day: -1 }).populate('by', 'name') });
});

// ---------- P&L and GST ----------
const ORDER_FIELDS = 'orderStatus paymentStatus type createdAt createdBy bills adjustments items.name items.quantity items.unitPaise items.price paymentMethod payments.method payments.amountPaise refunds.method refunds.amountPaise cancel';

// GET /api/accounting/pnl?from&to — sales by order date, like the sales report.
const pnl = handle(async (req, res) => {
    const { from, to } = req.query;
    const { start, end, timezone } = await range(from, to);
    const [orders, expenses, runs, movements] = await Promise.all([
        Order.find({ createdAt: { $gte: start, $lt: end } }).select(ORDER_FIELDS).lean(),
        Expense.aggregate([{ $match: { day: { $gte: from, $lte: to }, category: { $ne: STOCK_CATEGORY } } }, { $group: { _id: '$category', amountPaise: { $sum: '$amountPaise' } } }, { $sort: { amountPaise: -1 } }]),
        PayrollRun.find({ status: { $in: ['Finalized', 'Paid'] }, from: { $lte: to }, to: { $gte: from } }).select('status from to totalPaise tipsPaise').lean(),
        StockMovement.find({ createdAt: { $gte: start, $lt: end }, qty: { $lt: 0 } }).select('type qty unitCostPaise').lean(),
    ]);
    const { totals } = summarize(orders, timezone);
    const result = profitAndLoss({
        totals,
        expensesByCategory: expenses.map((e) => ({ key: e._id, amountPaise: e.amountPaise })),
        payrollPaise: payrollCost(runs, from, to),
        stock: stockCost(movements),
    });
    res.json({ success: true, data: { from, to, timezone, sales: totals, ...result } });
});

const gst = handle(async (req, res) => {
    const { from, to } = req.query;
    const { start, end, timezone } = await range(from, to);
    const orders = await Order.find({ createdAt: { $gte: start, $lt: end }, paymentStatus: 'Paid' }).select('orderStatus paymentStatus bills').lean();
    const rows = gstByRate(orders);
    const total = rows.reduce((t, r) => ({ orders: t.orders + r.orders, taxablePaise: t.taxablePaise + r.taxablePaise, taxPaise: t.taxPaise + r.taxPaise, cgstPaise: t.cgstPaise + r.cgstPaise, sgstPaise: t.sgstPaise + r.sgstPaise }), { orders: 0, taxablePaise: 0, taxPaise: 0, cgstPaise: 0, sgstPaise: 0 });
    res.json({ success: true, data: { from, to, timezone, rows, total } });
});

module.exports = { listExpenses, addExpense, editExpense, deleteExpense, closingPreview, closeDay, listClosings, pnl, gst };
