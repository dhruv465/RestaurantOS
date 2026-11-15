const TableRequest = require('../models/tableRequestModel');
const Table = require('../models/tableModel');
const createHttpError = require('http-errors');
const Order = require('../models/orderModel');
const { record } = require('../utils/audit');
const { emit } = require('../utils/realtime');
const mongoose = require('mongoose');
const crypto = require('crypto');

const addTable = async (req, res, next) => {
    try {
      const { tableNo, seats } = req.body;
      const area = typeof req.body.area === 'string' && req.body.area.trim() ? req.body.area.trim().slice(0, 40) : undefined;
      if (!tableNo) {
        const error = createHttpError(400, "Please provide table No!");
        return next(error);
      }
      const isTablePresent = await Table.findOne({ tableNo });
  
      if (isTablePresent) {
        const error = createHttpError(400, "Table already exist!");
        return next(error);
      }
  
      const newTable = new Table({ tableNo, seats, area });
      await newTable.save();
      record(req.user, 'table.create', 'table', newTable._id, { tableNo, seats });
      emit('table');
      res
        .status(201)
        .json({ success: true, message: "Table added!", data: newTable });
    } catch (error) {
      next(error);
    }
  };
  

const getTables = async (req, res, next) => {
    try {
      const tables = await Table.find().sort({ tableNo: 1 }).populate({
        path: "currentOrder",
        select: "customerDetails bills items createdAt paymentStatus orderNo"
      });
      res.status(200).json({ success: true, data: tables });
    } catch (error) {
      next(error);
    }
  };
  


const deleteTable = async (req, res, next) => {
    try {
        const table = await Table.findById(req.params.id);
        if (!table) {
            return next(createHttpError(404, "Table not found"));
        }
        
        if (table.status === "Booked") {
            return next(createHttpError(400, "Cannot delete a booked table"));
        }

        await Table.findByIdAndDelete(req.params.id);
        record(req.user, 'table.delete', 'table', table._id, { tableNo: table.tableNo });
        emit('table');
        res.status(200).json({ success: true, message: "Table deleted successfully" });

    } catch (error) {
        next(error);
    }
};

// tableController.js

const updateTable = async (req, res, next) => {
  try {
    const { status, orderId } = req.body;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return next(createHttpError(404, "Invalid id!"));
    if (!Table.schema.path('status').enumValues.includes(status)) return next(createHttpError(400, "Unknown table status"));

    const current = await Table.findById(id).populate('currentOrder', 'orderStatus');
    if (!current) return next(createHttpError(404, "Table not found!"));
    const busy = current.currentOrder && !['Completed', 'Cancelled'].includes(current.currentOrder.orderStatus);

    let update;
    if (status === 'Booked') {
      if (!mongoose.Types.ObjectId.isValid(orderId)) return next(createHttpError(400, "Booking a table needs an order"));
      update = { status, currentOrder: orderId, $currentDate: { statusSince: true } };
    } else {
      // Freeing, reserving or cleaning a table never closes its order: take payment or cancel it first.
      if (busy) return next(createHttpError(409, "This table has an open order. Take payment, cancel it or move it first."));
      update = status === 'Available' ? Table.FREE : { status, currentOrder: null, $currentDate: { statusSince: true } };
    }
    const table = await Table.findByIdAndUpdate(id, update, { new: true });

    record(req.user, 'table.update', 'table', table._id, { tableNo: table.tableNo, status });
    emit('table', { tableId: table._id });
    res.status(200).json({ success: true, message: "Table updated!", data: table });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/table/layout { tables: [{ id, area, posX, posY }] } — save the floor plan in one go.
const saveLayout = async (req, res, next) => {
  try {
    const list = req.body.tables;
    if (!Array.isArray(list) || list.length === 0 || list.length > 500) return next(createHttpError(400, "Send the tables to save"));
    const clamp = (n) => Math.min(100, Math.max(0, Math.round(Number(n) * 10) / 10));
    const ops = list.map((t) => {
      if (!mongoose.isValidObjectId(t.id)) throw createHttpError(400, "Invalid table id");
      const set = {};
      if (t.posX !== undefined && Number.isFinite(Number(t.posX))) set.posX = clamp(t.posX);
      if (t.posY !== undefined && Number.isFinite(Number(t.posY))) set.posY = clamp(t.posY);
      if (typeof t.area === 'string' && t.area.trim()) set.area = t.area.trim().slice(0, 40);
      return { updateOne: { filter: { _id: t.id }, update: { $set: set } } };
    });
    await Table.bulkWrite(ops);
    record(req.user, 'table.layout', 'table', null, { count: ops.length });
    emit('table');
    res.status(200).json({ success: true, message: "Floor plan saved" });
  } catch (error) {
    next(error);
  }
};

// POST /api/table/:id/qr — new QR link for the table (old printed QR stops working).
const rotateQr = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, "Table not found"));
    const table = await Table.findByIdAndUpdate(req.params.id, { qrToken: crypto.randomBytes(12).toString('base64url') }, { new: true });
    if (!table) return next(createHttpError(404, "Table not found"));
    record(req.user, 'table.qr', 'table', table._id, { tableNo: table.tableNo });
    res.status(200).json({ success: true, data: { qrToken: table.qrToken, tableNo: table.tableNo } });
  } catch (error) {
    next(error);
  }
};

// No 0/O, 1/I/L: the waiter reads it out loud.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const hashCode = (code) => crypto.createHash('sha256').update(String(code).toUpperCase()).digest('hex');

// POST /api/table/:id/guest-code — a fresh code for the party at this table; ends earlier guest sessions.
const newGuestCode = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, "Table not found"));
    const code = Array.from(crypto.randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
    const table = await Table.findByIdAndUpdate(
      req.params.id,
      { guestCodeHash: hashCode(code), $inc: { guestCodeVersion: 1 } },
      { new: true }
    );
    if (!table) return next(createHttpError(404, "Table not found"));
    if (!table.qrToken) {
      table.qrToken = crypto.randomBytes(12).toString('base64url');
      await table.save();
    }
    record(req.user, 'table.guest_code', 'table', table._id, { tableNo: table.tableNo });
    res.status(200).json({ success: true, data: { code, qrToken: table.qrToken, tableNo: table.tableNo } });
  } catch (error) {
    next(error);
  }
};

// GET /api/table/requests — open "call waiter" / "ask for bill" taps from guests.
const listRequests = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: await TableRequest.find({ status: 'Open' }).sort({ createdAt: 1 }) });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/table/requests/:id — staff handled it.
const resolveRequest = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, "Request not found"));
    const request = await TableRequest.findByIdAndUpdate(req.params.id, { status: 'Resolved', resolvedBy: req.user._id }, { new: true });
    if (!request) return next(createHttpError(404, "Request not found"));
    emit('request');
    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

module.exports = {
    saveLayout,
    listRequests,
    resolveRequest,
    hashCode,
    rotateQr,
    newGuestCode,
    addTable,
    getTables,
    updateTable,
    deleteTable
}
