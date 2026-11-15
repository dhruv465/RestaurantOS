// Staff and HR: PIN switch, attendance, rota, leave and payroll.
const createHttpError = require('http-errors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const Order = require('../models/orderModel');
const Settings = require('../models/settingsModel');
const { Attendance, Shift, Leave, PayProfile, PayrollRun } = require('../models/hrModels');
const { issueSession, publicUser } = require('./userController');
const { dayRange } = require('./reservationController');
const { localParts } = require('../utils/reports');
const { computePayroll } = require('../utils/payroll');
const { tooMany } = require('../utils/rateLimit');
const { can } = require('../config/permissions');
const { record } = require('../utils/audit');

const handle = (fn) => (req, res, next) => fn(req, res).catch(next);
const idOk = (id, what) => {
    if (!mongoose.isValidObjectId(id)) throw createHttpError(404, `${what} not found`);
};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const dateOk = (v, what) => {
    const d = new Date(v);
    if (!v || Number.isNaN(d.getTime())) throw createHttpError(400, `${what} is not a valid date/time`);
    return d;
};
const rangeOk = async (from, to, maxDays = 62) => {
    if (!DAY.test(from || '') || !DAY.test(to || '')) throw createHttpError(400, 'from and to must be YYYY-MM-DD');
    const { timezone } = await Settings.load();
    const [start] = dayRange(from, timezone);
    const [, end] = dayRange(to, timezone);
    if (end <= start) throw createHttpError(400, 'to must be on or after from');
    if (end - start > maxDays * 86400000) throw createHttpError(400, `Pick at most ${maxDays} days`);
    return { start, end, timezone };
};

// ---------- PIN ----------
const PIN_MAX_FAILURES = 10;
// POST /api/hr/pin { pin, password } — set your own PIN (password proves it's you).
const setOwnPin = handle(async (req, res) => {
    const pin = String(req.body.pin ?? '');
    if (!/^\d{4,6}$/.test(pin)) throw createHttpError(400, 'PIN must be 4 to 6 digits');
    const me = await User.findById(req.user._id).select('+password');
    if (!(await bcrypt.compare(String(req.body.password ?? ''), me.password))) throw createHttpError(401, 'Password is wrong');
    me.pinHash = await bcrypt.hash(pin, 10);
    me.pinFailures = 0;
    await me.save();
    record(req.user, 'user.pin_set', 'user', me._id);
    res.json({ success: true, message: 'PIN saved' });
});

// GET /api/hr/pin-users — who can switch in on this till (names only, for logged-in devices).
const pinUsers = handle(async (req, res) => {
    const users = await User.find({ active: { $ne: false }, pinHash: { $exists: true } }).select('name role').sort({ name: 1 });
    res.json({ success: true, data: users });
});

// POST /api/hr/pin-switch { userId, pin } — swap the logged-in user on a shared till.
const pinSwitch = handle(async (req, res) => {
    idOk(req.body.userId, 'User');
    // 5 tries per person per minute, from any till.
    if (tooMany(`pin:${req.body.userId}`, 5, 60000)) throw createHttpError(429, 'Too many tries. Wait a minute.');
    const user = await User.findById(req.body.userId).select('+pinHash +pinFailures');
    const ok = user && user.active !== false && user.pinHash && (await bcrypt.compare(String(req.body.pin ?? ''), user.pinHash));
    if (!ok) {
        // Persistent count, so a slow guesser (or a server restart) can't get past the per-minute limit.
        // At the limit the PIN is removed; only the owner can set a new one, and that needs their password.
        if (user?.pinHash) {
            const after = await User.findOneAndUpdate({ _id: user._id, pinHash: user.pinHash }, { $inc: { pinFailures: 1 } }, { new: true }).select('+pinFailures');
            if (after && after.pinFailures >= PIN_MAX_FAILURES) {
                await User.updateOne({ _id: user._id, pinHash: user.pinHash }, { $unset: { pinHash: 1 }, $set: { pinFailures: 0 } });
                record(req.user, 'user.pin_locked', 'user', user._id, { failures: after.pinFailures });
                throw createHttpError(423, `Too many wrong PINs. ${user.name} must log in with their password and set a new PIN.`);
            }
        }
        throw createHttpError(401, 'Wrong PIN');
    }
    if (user.pinFailures) await User.updateOne({ _id: user._id }, { $set: { pinFailures: 0 } });
    issueSession(res, user);
    record(user, 'user.pin_switch', 'user', user._id, { from: String(req.user._id) });
    res.json({ success: true, data: publicUser(user) });
});

// ---------- Attendance ----------
const myAttendance = handle(async (req, res) => {
    const list = await Attendance.find({ user: req.user._id }).sort({ clockIn: -1 }).limit(14);
    res.json({ success: true, data: { open: list.find((a) => !a.clockOut) || null, recent: list } });
});

const clockIn = handle(async (req, res) => {
    try {
        const entry = await Attendance.create({ user: req.user._id, clockIn: new Date(), open: true });
        record(req.user, 'attendance.clock_in', 'attendance', entry._id);
        res.status(201).json({ success: true, data: entry });
    } catch (error) {
        if (error.code === 11000) throw createHttpError(409, 'You are already clocked in');
        throw error;
    }
});

const clockOut = handle(async (req, res) => {
    const breakMinutes = Math.max(0, Math.min(600, parseInt(req.body.breakMinutes, 10) || 0));
    const entry = await Attendance.findOneAndUpdate({ user: req.user._id, open: true }, { clockOut: new Date(), breakMinutes, $unset: { open: 1 } }, { new: true });
    if (!entry) throw createHttpError(409, 'You are not clocked in');
    record(req.user, 'attendance.clock_out', 'attendance', entry._id, { breakMinutes });
    res.json({ success: true, data: entry });
});

// GET /api/hr/attendance?from&to&user — everyone (hr.manage).
const listAttendance = handle(async (req, res) => {
    const { start, end } = await rangeOk(req.query.from, req.query.to);
    const filter = { clockIn: { $gte: start, $lt: end } };
    if (req.query.user) {
        idOk(req.query.user, 'User');
        filter.user = req.query.user;
    }
    res.json({ success: true, data: await Attendance.find(filter).sort({ clockIn: -1 }).populate('user', 'name role').populate('editedBy', 'name') });
});

const pickAttendance = (b) => {
    const out = {};
    if (b.clockIn !== undefined) out.clockIn = dateOk(b.clockIn, 'Clock in');
    if (b.clockOut !== undefined) out.clockOut = b.clockOut ? dateOk(b.clockOut, 'Clock out') : null;
    if (b.breakMinutes !== undefined) out.breakMinutes = Math.max(0, Math.min(600, parseInt(b.breakMinutes, 10) || 0));
    if (typeof b.note === 'string') out.note = b.note.trim().slice(0, 200);
    if (out.clockIn && out.clockOut && out.clockOut <= out.clockIn) throw createHttpError(400, 'Clock out must be after clock in');
    return out;
};

// POST /api/hr/attendance { user, clockIn, clockOut, breakMinutes, note } — add a forgotten entry.
const addAttendance = handle(async (req, res) => {
    idOk(req.body.user, 'User');
    const fields = pickAttendance(req.body);
    if (!fields.clockIn || !fields.clockOut) throw createHttpError(400, 'Clock in and clock out are required');
    if (!fields.note) throw createHttpError(400, 'Give a reason');
    const entry = await Attendance.create({ ...fields, user: req.body.user, editedBy: req.user._id });
    record(req.user, 'attendance.add', 'attendance', entry._id, { user: req.body.user, note: fields.note });
    res.status(201).json({ success: true, data: entry });
});

// PATCH /api/hr/attendance/:id — fix times; a reason is required.
const editAttendance = handle(async (req, res) => {
    idOk(req.params.id, 'Entry');
    const fields = pickAttendance(req.body);
    if (!fields.note) throw createHttpError(400, 'Give a reason');
    const entry = await Attendance.findById(req.params.id);
    if (!entry) throw createHttpError(404, 'Entry not found');
    Object.assign(entry, fields, { editedBy: req.user._id });
    if (entry.clockOut && entry.clockOut <= entry.clockIn) throw createHttpError(400, 'Clock out must be after clock in');
    await entry.save();
    record(req.user, 'attendance.edit', 'attendance', entry._id, { fields: Object.keys(fields), note: fields.note });
    res.json({ success: true, data: entry });
});

// ---------- Rota ----------
const listShifts = handle(async (req, res) => {
    const { start, end } = await rangeOk(req.query.from, req.query.to, 31);
    res.json({ success: true, data: await Shift.find({ start: { $lt: end }, end: { $gt: start } }).sort({ start: 1 }).populate('user', 'name role') });
});

const saveShift = handle(async (req, res) => {
    const id = req.params.id;
    if (id) idOk(id, 'Shift');
    idOk(req.body.user, 'User');
    const start = dateOk(req.body.start, 'Start');
    const end = dateOk(req.body.end, 'End');
    if (end <= start || end - start > 16 * 3600000) throw createHttpError(400, 'A shift must end after it starts and last at most 16 hours');
    const clash = await Shift.exists({ user: req.body.user, _id: { $ne: id || null }, start: { $lt: end }, end: { $gt: start } });
    if (clash) throw createHttpError(409, 'This person already has a shift at that time');
    const fields = { user: req.body.user, start, end, note: typeof req.body.note === 'string' ? req.body.note.slice(0, 100) : '' };
    const shift = id ? await Shift.findByIdAndUpdate(id, fields, { new: true }) : await Shift.create(fields);
    if (!shift) throw createHttpError(404, 'Shift not found');
    record(req.user, id ? 'shift.update' : 'shift.create', 'shift', shift._id, { user: req.body.user });
    res.status(id ? 200 : 201).json({ success: true, data: shift });
});

const deleteShift = handle(async (req, res) => {
    idOk(req.params.id, 'Shift');
    const shift = await Shift.findByIdAndDelete(req.params.id);
    if (!shift) throw createHttpError(404, 'Shift not found');
    record(req.user, 'shift.delete', 'shift', shift._id);
    res.json({ success: true });
});

// ---------- Leave ----------
// GET /api/hr/leave — your own; HR sees everyone's.
const listLeave = handle(async (req, res) => {
    const filter = can(req.user, 'hr.manage') ? {} : { user: req.user._id };
    res.json({ success: true, data: await Leave.find(filter).sort({ from: -1 }).limit(200).populate('user', 'name').populate('decidedBy', 'name') });
});

const requestLeave = handle(async (req, res) => {
    const { from, to, type } = req.body;
    if (!DAY.test(from || '') || !DAY.test(to || '') || to < from) throw createHttpError(400, 'Pick valid from and to dates');
    if (!['paid', 'unpaid', 'sick'].includes(type)) throw createHttpError(400, 'Pick a leave type');
    const leave = await Leave.create({ user: req.user._id, from, to, type, reason: typeof req.body.reason === 'string' ? req.body.reason.slice(0, 300) : '' });
    record(req.user, 'leave.request', 'leave', leave._id, { from, to, type });
    res.status(201).json({ success: true, data: leave });
});

const decideLeave = handle(async (req, res) => {
    idOk(req.params.id, 'Leave');
    if (!['Approved', 'Rejected'].includes(req.body.status)) throw createHttpError(400, 'Approve or reject');
    const leave = await Leave.findOneAndUpdate({ _id: req.params.id, status: 'Pending' }, { status: req.body.status, decidedBy: req.user._id }, { new: true });
    if (!leave) throw createHttpError(409, 'Already decided');
    record(req.user, 'leave.decide', 'leave', leave._id, { status: req.body.status });
    res.json({ success: true, data: leave });
});

// GET /api/hr/staff — names for HR pickers (managers have hr.manage but not staff.manage).
const staffList = handle(async (req, res) => {
    res.json({ success: true, data: await User.find({ active: { $ne: false } }).select('name role').sort({ name: 1 }) });
});

// ---------- Payroll ----------
const listProfiles = handle(async (req, res) => {
    const [users, profiles] = await Promise.all([User.find({ active: { $ne: false } }).select('name role').sort({ name: 1 }), PayProfile.find()]);
    const byUser = Object.fromEntries(profiles.map((p) => [String(p.user), p]));
    res.json({ success: true, data: users.map((u) => ({ user: u, profile: byUser[String(u._id)] || null })) });
});

const saveProfile = handle(async (req, res) => {
    idOk(req.params.userId, 'User');
    if (!(await User.exists({ _id: req.params.userId }))) throw createHttpError(404, 'User not found');
    const b = req.body;
    if (!['hourly', 'monthly'].includes(b.type)) throw createHttpError(400, 'Pay type must be hourly or monthly');
    const money = (v) => {
        const n = Number(v ?? 0);
        if (!Number.isInteger(n) || n < 0) throw createHttpError(400, 'Amounts must be whole paise, 0 or more');
        return n;
    };
    const fields = {
        type: b.type,
        hourlyRatePaise: money(b.hourlyRatePaise),
        monthlySalaryPaise: money(b.monthlySalaryPaise),
        overtimeAfterMinutes: Math.max(0, Math.min(1440, parseInt(b.overtimeAfterMinutes, 10) || 0)),
        overtimeMultiplier: Math.max(1, Math.min(3, Number(b.overtimeMultiplier) || 1.5)),
        tipPool: b.tipPool !== false,
    };
    const profile = await PayProfile.findOneAndUpdate({ user: req.params.userId }, fields, { upsert: true, new: true, runValidators: true });
    record(req.user, 'payroll.profile', 'user', req.params.userId, { type: fields.type });
    res.json({ success: true, data: profile });
});

const calculate = async (from, to) => {
    const { start, end, timezone } = await rangeOk(from, to);
    const [profiles, attendance, leaves, tips] = await Promise.all([
        PayProfile.find().populate('user', 'name active'),
        Attendance.find({ clockIn: { $gte: start, $lt: end }, clockOut: { $ne: null } }).lean(),
        Leave.find({ status: 'Approved', from: { $lte: to }, to: { $gte: from } }).lean(),
        Order.aggregate([
            { $match: { createdAt: { $gte: start, $lt: end }, paymentStatus: 'Paid' } },
            { $group: { _id: null, tips: { $sum: { $ifNull: ['$bills.tipPaise', 0] } } } },
        ]),
    ]);
    return computePayroll({
        period: { from, to },
        tipsPaise: tips[0]?.tips || 0,
        staff: profiles.filter((p) => p.user).map((p) => ({ userId: p.user._id, name: p.user.name, profile: p.toObject() })),
        attendance: attendance.map((a) => ({ ...a, day: localParts(a.clockIn, timezone).day })),
        leaves,
    });
};

const listRuns = handle(async (req, res) => {
    res.json({ success: true, data: await PayrollRun.find().sort({ createdAt: -1 }).limit(50) });
});

// POST /api/hr/payroll/runs { from, to } — a draft you can check before finalizing.
const createRun = handle(async (req, res) => {
    const result = await calculate(req.body.from, req.body.to);
    const run = await PayrollRun.create({ from: req.body.from, to: req.body.to, ...result, createdBy: req.user._id });
    record(req.user, 'payroll.run.create', 'payrollRun', run._id, { from: run.from, to: run.to, totalPaise: run.totalPaise });
    res.status(201).json({ success: true, data: run });
});

// POST /api/hr/payroll/runs/:id/:action  action = recalculate | finalize | paid
const runAction = handle(async (req, res) => {
    idOk(req.params.id, 'Payroll run');
    const run = await PayrollRun.findById(req.params.id);
    if (!run) throw createHttpError(404, 'Payroll run not found');
    const { action } = req.params;
    let update;
    if (action === 'recalculate' && run.status === 'Draft') update = await calculate(run.from, run.to);
    else if (action === 'finalize' && run.status === 'Draft') update = { status: 'Finalized', finalizedAt: new Date() };
    else if (action === 'paid' && run.status === 'Finalized') update = { status: 'Paid', paidAt: new Date() };
    else throw createHttpError(409, `Cannot ${({ paid: 'mark as paid', finalize: 'finalize', recalculate: 'recalculate' })[action] || action} a ${run.status.toLowerCase()} run`);
    const saved = await PayrollRun.findOneAndUpdate({ _id: run._id, status: run.status }, update, { new: true });
    if (!saved) throw createHttpError(409, 'Run changed; reload');
    record(req.user, `payroll.run.${action}`, 'payrollRun', run._id, { totalPaise: saved.totalPaise });
    res.json({ success: true, data: saved });
});

const deleteRun = handle(async (req, res) => {
    idOk(req.params.id, 'Payroll run');
    const run = await PayrollRun.findOneAndDelete({ _id: req.params.id, status: 'Draft' });
    if (!run) throw createHttpError(409, 'Only draft runs can be deleted');
    record(req.user, 'payroll.run.delete', 'payrollRun', run._id);
    res.json({ success: true });
});

module.exports = {
    setOwnPin, pinUsers, pinSwitch, staffList, myAttendance, clockIn, clockOut, listAttendance, addAttendance, editAttendance,
    listShifts, saveShift, deleteShift, listLeave, requestLeave, decideLeave,
    listProfiles, saveProfile, listRuns, createRun, runAction, deleteRun,
};
