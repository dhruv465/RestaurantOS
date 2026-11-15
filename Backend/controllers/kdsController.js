const createHttpError = require('http-errors');
const mongoose = require('mongoose');
const Kot = require('../models/kotModel');
const Order = require('../models/orderModel');
const { record } = require('../utils/audit');
const { emit } = require('../utils/realtime');
const { completeIfDone } = require('../utils/checkout');

// GET /api/kds/tickets?station=Tandoor — open tickets, priority first, oldest first.
const getTickets = async (req, res, next) => {
    try {
        // shortcut: only the last 24 h, so forgotten tickets don't pile up forever; add a "clear board" action if needed.
        const filter = { status: { $ne: 'Served' }, createdAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } };
        if (req.query.station) filter.station = String(req.query.station);
        const tickets = await Kot.find(filter).sort({ isPriority: -1, createdAt: 1 }).limit(300);
        res.status(200).json({ success: true, data: tickets });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/kds/tickets/:id/status { from, to } — compare-and-set so two screens can't both move a ticket.
const updateTicketStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { from, to } = req.body;
        if (!mongoose.isValidObjectId(id)) return next(createHttpError(404, 'Ticket not found'));
        if (!Kot.STATUSES.includes(to) || !Kot.STATUSES.includes(from)) return next(createHttpError(400, 'Invalid status'));

        const ticket = await Kot.findOneAndUpdate(
            { _id: id, status: from },
            { status: to, [`statusAt.${to}`]: new Date() },
            { new: true }
        );
        if (!ticket) {
            const exists = await Kot.exists({ _id: id });
            return next(createHttpError(exists ? 409 : 404, exists ? 'Ticket was already moved on another screen' : 'Ticket not found'));
        }

        // Tell the waiter who took the order (null = any floor staff); the screen that made the change stays quiet.
        const alert = async (kind) => {
            const order = await Order.findById(ticket.order).select('createdBy');
            emit('alert', { kind, orderNo: ticket.orderNo, tableNo: ticket.tableNo, waiterId: order?.createdBy || null, actorId: req.user._id });
        };
        if (to === 'Preparing' && from === 'New') await alert('preparing');

        // Every ticket for the order is done cooking -> the order is Ready for the floor.
        if (['Ready', 'Served'].includes(to) && !(await Kot.exists({ order: ticket.order, status: { $in: ['New', 'Preparing'] } }))) {
            const { modifiedCount } = await Order.updateOne({ _id: ticket.order, orderStatus: 'In Progress' }, { orderStatus: 'Ready' });
            if (modifiedCount) {
                emit('order', { orderId: ticket.order });
                if (to === 'Ready') await alert('ready');
            }
        }

        if (to === 'Served') await completeIfDone(ticket.order);

        record(req.user, 'kot.status', 'kot', ticket._id, { orderNo: ticket.orderNo, ticketNo: ticket.ticketNo, from, to });
        emit('kot');
        res.status(200).json({ success: true, data: ticket });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/kds/tickets/:id/priority { isPriority }
const setTicketPriority = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return next(createHttpError(404, 'Ticket not found'));
        const ticket = await Kot.findByIdAndUpdate(id, { isPriority: !!req.body.isPriority }, { new: true });
        if (!ticket) return next(createHttpError(404, 'Ticket not found'));
        emit('kot');
        res.status(200).json({ success: true, data: ticket });
    } catch (error) {
        next(error);
    }
};

module.exports = { getTickets, updateTicketStatus, setTicketPriority };
