const createHttpError = require('http-errors');
const Settings = require('../models/settingsModel');
const AuditLog = require('../models/auditLogModel');
const { record } = require('../utils/audit');
const { emit } = require('../utils/realtime');

const getSettings = async (req, res, next) => {
    try {
        const settings = (await Settings.load()).toObject();
        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
};

const updateSettings = async (req, res, next) => {
    try {
        const update = {};
        for (const key of Settings.EDITABLE) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }
        if (update.stations !== undefined) {
            if (!Array.isArray(update.stations)) return next(createHttpError(400, 'stations must be a list'));
            update.stations = [...new Set(update.stations.map((s) => String(s).trim()).filter(Boolean))].slice(0, 20);
            if (!update.stations.length) return next(createHttpError(400, 'Keep at least one kitchen station'));
        }
        if (update.upiVpa !== undefined && update.upiVpa !== '' && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(String(update.upiVpa).trim())) {
            return next(createHttpError(400, 'UPI ID looks wrong (expected name@bank)'));
        }
        if (update.publicBaseUrl) {
            try {
                const url = new URL(String(update.publicBaseUrl));
                if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
                update.publicBaseUrl = url.origin;
            } catch {
                return next(createHttpError(400, 'Guest menu address must start with http:// or https://'));
            }
        }
        if (update.timezone !== undefined) {
            try {
                new Intl.DateTimeFormat('en-CA', { timeZone: update.timezone });
            } catch {
                return next(createHttpError(400, 'Unknown timezone'));
            }
        }

        await Settings.load(); // make sure the document exists
        const settings = await Settings.findByIdAndUpdate('restaurant', update, { new: true, runValidators: true });

        record(req.user, 'settings.update', 'settings', 'restaurant', update);
        emit('settings');
        res.status(200).json({ success: true, message: 'Settings saved', data: settings });
    } catch (error) {
        next(error);
    }
};

// GET /api/audit?entity=order&action=order.update&limit=100
const getAuditLogs = async (req, res, next) => {
    try {
        const filter = {};
        // String() so a query like ?entity[$ne]=x can't become a Mongo operator.
        if (req.query.entity) filter.entity = String(req.query.entity);
        if (req.query.action) filter.action = String(req.query.action);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);

        const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit);
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};

module.exports = { getSettings, updateSettings, getAuditLogs };
