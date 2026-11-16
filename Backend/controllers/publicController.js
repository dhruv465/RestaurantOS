// Guest (QR) ordering. No staff login: a guest scans the table QR, types the table code staff gave them,
// and gets a guestSession cookie tied to that table and code version. Freeing the table or issuing a new
// code bumps the version, which ends every earlier guest session.
const crypto = require('crypto');
const createHttpError = require('http-errors');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Table = require('../models/tableModel');
const Item = require('../models/itemModel');
const Category = require('../models/categoryModel');
const ModifierGroup = require('../models/modifierGroupModel');
const Order = require('../models/orderModel');
const Kot = require('../models/kotModel');
const Counter = require('../models/counterModel');
const Settings = require('../models/settingsModel');
const TableRequest = require('../models/tableRequestModel');
const { priceOrder } = require('../utils/pricing');
const { emit } = require('../utils/realtime');
const { tooMany } = require('../utils/rateLimit');
const { hashCode } = require('./tableController');

const COOKIE = 'guestSession';
const SESSION_HOURS = 4;
const MAX_PENDING = 3;

const tableByToken = async (qrToken, extra = '') => {
    const table = typeof qrToken === 'string' && qrToken.length <= 64 && (await Table.findOne({ qrToken }).select(extra));
    if (!table) throw createHttpError(404, 'This table QR is no longer valid. Ask staff for help.');
    return table;
};

const menuPayload = async () => {
    const [settings, categories, items, groups] = await Promise.all([
        Settings.load(),
        Category.find().select('name').sort({ name: 1 }),
        Item.find().sort({ sortOrder: 1, name: 1 })
            .select('name price category itemCategory description image available allergens spiceLevel modifierGroups'),
        ModifierGroup.find().select('name minSelect maxSelect options'),
    ]);
    return {
        restaurantName: settings.restaurantName,
        taxRatePercent: settings.taxRatePercent,
        taxInclusive: settings.taxInclusive,
        categories,
        items,
        modifierGroups: groups,
    };
};

// GET /api/public/menu/:qrToken
const getMenu = async (req, res, next) => {
    try {
        const table = await tableByToken(req.params.qrToken);
        res.status(200).json({ success: true, data: { ...(await menuPayload()), tableNo: table.tableNo } });
    } catch (error) {
        next(error);
    }
};

// POST /api/public/menu/:qrToken/join { code }
const join = async (req, res, next) => {
    try {
        const table = await tableByToken(req.params.qrToken, '+guestCodeHash');
        // 10 guesses per table per phone per 15 min; 30 per table from anywhere (31^6 codes).
        if (tooMany(`join:${table._id}:${req.ip}`, 10, 15 * 60000) || tooMany(`join:${table._id}`, 30, 15 * 60000)) {
            return next(createHttpError(429, 'Too many tries. Wait a few minutes or ask staff.'));
        }
        const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
        const ok = table.guestCodeHash && code.length === 6 &&
            crypto.timingSafeEqual(Buffer.from(hashCode(code)), Buffer.from(table.guestCodeHash));
        if (!ok) return next(createHttpError(401, 'That code is not right. Check the code from your server.'));

        const token = jwt.sign({ kind: 'guest', tableId: String(table._id), v: table.guestCodeVersion }, config.accessTokenSecret, {
            expiresIn: `${SESSION_HOURS}h`,
        });
        res.cookie(COOKIE, token, {
            httpOnly: true,
            sameSite: config.nodeEnv === 'production' ? 'none' : 'lax', // same as the staff login cookie
            secure: config.nodeEnv === 'production',
            maxAge: SESSION_HOURS * 3600000,
        });
        res.status(200).json({ success: true, data: { tableNo: table.tableNo } });
    } catch (error) {
        next(error);
    }
};

// Middleware: req.guest = { table, version } or 401.
const isGuest = async (req, res, next) => {
    try {
        const decoded = jwt.verify(req.cookies[COOKIE] || '', config.accessTokenSecret);
        if (decoded.kind !== 'guest') throw new Error();
        const table = await Table.findById(decoded.tableId);
        if (!table || table.guestCodeVersion !== decoded.v) throw new Error();
        req.guest = { table, version: decoded.v };
        next();
    } catch {
        next(createHttpError(401, 'Your table session ended. Ask staff for a new table code.'));
    }
};

const guestView = async (order) => {
    // An accepted order is merged into the table's bill; report the kitchen progress of that bill.
    let status = order.acceptance === 'Pending' ? 'Waiting for staff' : order.acceptance === 'Declined' ? 'Declined' : 'Sent to kitchen';
    if (order.acceptance === 'Accepted') {
        const target = order.cancel?.mergedInto ? await Order.findById(order.cancel.mergedInto).select('orderStatus') : order;
        if (target?.orderStatus === 'In Progress' && (await Kot.exists({ order: target._id, status: 'Preparing', createdAt: { $gte: order.createdAt } }))) status = 'Being prepared';
        if (target?.orderStatus === 'Ready') status = 'Ready';
        if (target?.orderStatus === 'Completed') status = 'Served';
    }
    return {
        _id: order._id,
        orderNo: order.orderNo,
        status,
        declineReason: order.acceptance === 'Declined' ? order.cancel?.reason : undefined,
        items: order.items.map(({ name, quantity, modifiers, instructions }) => ({
            name, quantity, instructions, modifiers: (modifiers || []).map((m) => m.name),
        })),
        bills: order.bills,
        createdAt: order.createdAt,
    };
};

// Guests choose only item, quantity, add-ons and a note; prices and availability come from the server.
const guestLines = (rawItems) => rawItems.map((l, i) => ({
    id: `g${Date.now()}${i}`,
    itemId: l?.itemId,
    quantity: l?.quantity,
    instructions: typeof l?.instructions === 'string' ? l.instructions.slice(0, 200) : '',
    modifiers: Array.isArray(l?.modifiers) ? l.modifiers : [],
}));

// POST /api/public/order { items, name, clientRequestId }
const placeOrder = async (req, res, next) => {
    try {
        const { table, version } = req.guest;
        const rawItems = req.body.items;
        if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
            return next(createHttpError(400, 'Add between 1 and 50 items'));
        }
        const clientRequestId = typeof req.body.clientRequestId === 'string' ? `qr:${req.body.clientRequestId.slice(0, 100)}` : undefined;
        if (clientRequestId) {
            const existing = await Order.findOne({ clientRequestId, table: table._id });
            if (existing) return res.status(200).json({ success: true, data: await guestView(existing), replay: true });
        }
        const pending = await Order.countDocuments({ table: table._id, guestSession: version, acceptance: 'Pending' });
        if (pending >= MAX_PENDING) return next(createHttpError(429, 'Staff are still checking your earlier orders. Please wait.'));

        const { items, bills, settings } = await priceOrder(guestLines(rawItems), {}, []);
        const name = typeof req.body.name === 'string' && req.body.name.trim() ? req.body.name.trim().slice(0, 60) : `Table ${table.tableNo} guest`;

        let order;
        try {
            order = await Order.create({
                clientRequestId,
                customerDetails: { name, phone: '-', guests: 1 },
                orderStatus: 'In Progress',
                type: 'Dine-in',
                channel: 'QR',
                acceptance: 'Pending',
                guestSession: version,
                table: table._id,
                items,
                bills,
                orderNo: await Counter.nextOrderNo(settings.timezone),
            });
        } catch (error) {
            if (error.code === 11000 && error.keyValue?.clientRequestId) {
                return res.status(200).json({ success: true, data: await guestView(await Order.findOne({ clientRequestId })), replay: true });
            }
            throw error;
        }
        emit('order', { orderId: order._id, guest: true, tableNo: table.tableNo });
        res.status(201).json({ success: true, data: await guestView(order) });
    } catch (error) {
        next(error);
    }
};

// GET /api/public/orders — this guest session's orders.
const myOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ table: req.guest.table._id, guestSession: req.guest.version, channel: 'QR' }).sort({ createdAt: -1 }).limit(20);
        res.status(200).json({ success: true, data: { tableNo: req.guest.table.tableNo, orders: await Promise.all(orders.map(guestView)) } });
    } catch (error) {
        next(error);
    }
};

// POST /api/public/request { type: 'waiter' | 'bill' }
const callStaff = async (req, res, next) => {
    try {
        const type = req.body.type;
        if (!TableRequest.schema.path('type').enumValues.includes(type)) return next(createHttpError(400, 'Unknown request'));
        const { table } = req.guest;
        // One open request per kind per table: repeated taps don't pile up.
        const request = await TableRequest.findOneAndUpdate(
            { table: table._id, type, status: 'Open' },
            { $setOnInsert: { table: table._id, tableNo: table.tableNo, type, status: 'Open' } },
            { upsert: true, new: true }
        );
        emit('request');
        emit('alert', { kind: request.type, tableNo: table.tableNo }); // 'waiter' | 'bill'
        res.status(200).json({ success: true, data: { type: request.type, status: request.status } });
    } catch (error) {
        next(error);
    }
};

module.exports = { getMenu, join, isGuest, placeOrder, myOrders, callStaff };
