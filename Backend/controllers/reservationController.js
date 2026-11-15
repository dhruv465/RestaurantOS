const createHttpError = require('http-errors');
const mongoose = require('mongoose');
const { Reservation, Waitlist } = require('../models/reservationModel');
const Settings = require('../models/settingsModel');
const { record } = require('../utils/audit');
const { emit } = require('../utils/realtime');

const pick = (body, keys) => Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
const RES_FIELDS = ['name', 'phone', 'partySize', 'at', 'table', 'notes', 'status'];
const WAIT_FIELDS = ['name', 'phone', 'partySize', 'quotedMinutes', 'status'];

// Start/end of a calendar day in the restaurant's timezone, as UTC instants.
const dayRange = (yyyyMmDd, timezone) => {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    const guess = Date.UTC(y, m - 1, d);
    // Offset of the timezone at that date, e.g. +330 min for Asia/Kolkata.
    const local = new Date(new Date(guess).toLocaleString('en-US', { timeZone: timezone }));
    const offset = local.getTime() - new Date(new Date(guess).toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    const start = new Date(guess - offset);
    return [start, new Date(start.getTime() + 24 * 3600 * 1000)];
};

// GET /api/reservations?date=2026-11-15
const listReservations = async (req, res, next) => {
    try {
        const date = String(req.query.date || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return next(createHttpError(400, 'date must be YYYY-MM-DD'));
        const { timezone } = await Settings.load();
        const [from, to] = dayRange(date, timezone);
        const list = await Reservation.find({ at: { $gte: from, $lt: to } }).sort({ at: 1 }).populate('table', 'tableNo seats');
        res.status(200).json({ success: true, data: list });
    } catch (error) {
        next(error);
    }
};

const createReservation = async (req, res, next) => {
    try {
        const reservation = await Reservation.create({ ...pick(req.body, RES_FIELDS), status: 'Booked', createdBy: req.user._id });
        record(req.user, 'reservation.create', 'reservation', reservation._id, { name: reservation.name, at: reservation.at, partySize: reservation.partySize });
        emit('reservation');
        res.status(201).json({ success: true, data: reservation });
    } catch (error) {
        next(error);
    }
};

const updateReservation = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, 'Reservation not found'));
        const reservation = await Reservation.findByIdAndUpdate(req.params.id, pick(req.body, RES_FIELDS), { new: true, runValidators: true });
        if (!reservation) return next(createHttpError(404, 'Reservation not found'));
        record(req.user, 'reservation.update', 'reservation', reservation._id, pick(req.body, ['status', 'at', 'table']));
        emit('reservation');
        res.status(200).json({ success: true, data: reservation });
    } catch (error) {
        next(error);
    }
};

const listWaitlist = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: await Waitlist.find({ status: 'Waiting' }).sort({ createdAt: 1 }) });
    } catch (error) {
        next(error);
    }
};

const addToWaitlist = async (req, res, next) => {
    try {
        const entry = await Waitlist.create({ ...pick(req.body, WAIT_FIELDS), status: 'Waiting' });
        emit('reservation');
        res.status(201).json({ success: true, data: entry });
    } catch (error) {
        next(error);
    }
};

const updateWaitlist = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, 'Not on the waitlist'));
        const entry = await Waitlist.findByIdAndUpdate(req.params.id, pick(req.body, WAIT_FIELDS), { new: true, runValidators: true });
        if (!entry) return next(createHttpError(404, 'Not on the waitlist'));
        emit('reservation');
        res.status(200).json({ success: true, data: entry });
    } catch (error) {
        next(error);
    }
};

module.exports = { dayRange, listReservations, createReservation, updateReservation, listWaitlist, addToWaitlist, updateWaitlist };
