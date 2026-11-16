const { default: mongoose } = require('mongoose');
const Order = require('../models/orderModel');
const Counter = require('../models/counterModel');
const createHttpError = require('http-errors');
const { priceOrder, cleanAdjustments } = require('../utils/pricing');
const { applyPayments, billsFor, cleanPayments, withFee } = require('../utils/checkout');
const { record } = require('../utils/audit');
const { emit } = require('../utils/realtime');
const { sendToKitchen } = require('../utils/kitchen');
const Table = require('../models/tableModel');
const Kot = require('../models/kotModel');
const scheduler = require('../utils/scheduler');

// Delivery stays in the schema only so old orders still load; new orders are dine-in or takeaway.
const ORDER_TYPES = ['Dine-in', 'Takeaway'];

// Cancelled is only set by POST /:id/cancel, never by a plain status change.
// Clients may only move kitchen progress. Completed is set by payment (completeIfDone), never by a plain update,
// otherwise an unpaid order could be closed and drop out of the open list.
const STATUSES = ['In Progress', 'Ready'];
const OPEN = { $nin: ['Completed', 'Cancelled'] };
const assertAccepted = (order) => {
  if (order.acceptance === 'Pending') throw createHttpError(409, 'Accept or decline this guest order first');
};

// Only these fields may come from the client. Totals never do.
const pickOrderFields = (body, user) => {
  const fields = {};
  if (body.customerDetails) {
    // No guest name or phone is kept: the restaurant doesn't collect customer data.
    const { guests } = body.customerDetails;
    fields.customerDetails = { name: 'Guest', phone: '', guests: Number(guests) > 0 ? Number(guests) : 1 };
  }
  if (body.table !== undefined) fields.table = body.table || undefined;
  if (body.orderType !== undefined) {
    if (!ORDER_TYPES.includes(body.orderType)) throw createHttpError(400, 'Invalid order type');
    fields.type = body.orderType;
  }
  if (body.orderStatus !== undefined) {
    if (!STATUSES.includes(body.orderStatus)) throw createHttpError(400, 'Invalid order status');
    fields.orderStatus = body.orderStatus;
  }
  if (body.paymentMethod !== undefined) {
    throw createHttpError(400, 'Take payment with POST /api/order/:id/checkout');
  }
  return fields;
};

const previewPrice = async (req, res, next) => {
  try {
    const adjustments = cleanAdjustments(req.body.adjustments);
    const { items, bills } = await priceOrder(req.body.items, adjustments);
    res.status(200).json({ success: true, data: { items, bills } });
  } catch (error) {
    next(error);
  }
};

// Takeaway may be scheduled up to 14 days ahead.
const schedule = (body, fields) => {
  const out = { adjustments: {} };
  if (body.scheduledFor) {
    if (fields.type !== 'Takeaway') throw createHttpError(400, 'Only takeaway orders can be scheduled');
    const at = new Date(body.scheduledFor);
    if (Number.isNaN(at.getTime())) throw createHttpError(400, 'Scheduled time is not valid');
    if (at.getTime() < Date.now() + 5 * 60000) throw createHttpError(400, 'Schedule at least 5 minutes ahead');
    if (at.getTime() > Date.now() + 14 * 86400000) throw createHttpError(400, 'Schedule at most 14 days ahead');
    out.scheduledFor = at;
  }
  return out;
};

const addOrder = async (req, res, next) => {
  try {
    const fields = pickOrderFields(req.body, req.user);
    fields.customerDetails ||= { name: 'Guest', phone: '', guests: 1 };
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return next(createHttpError(400, 'Order needs at least one item'));
    }
    const clientRequestId = typeof req.body.clientRequestId === 'string' ? req.body.clientRequestId.slice(0, 100) : undefined;
    if (clientRequestId) {
      const existing = await Order.findOne({ clientRequestId });
      if (existing) return res.status(200).json({ success: true, message: "Order already created", data: existing, replay: true });
    }
    const extra = schedule(req.body, fields);
    const { items, bills, settings } = await priceOrder(req.body.items, extra.adjustments, []);
    const kitchenHeld = !!extra.scheduledFor && extra.scheduledFor.getTime() - Date.now() > (settings.scheduleLeadMinutes ?? 30) * 60000;

    let order;
    try {
      order = await Order.create({
        clientRequestId,
        orderStatus: 'In Progress',
        ...fields,
        items,
        bills,
        adjustments: extra.adjustments,
        scheduledFor: extra.scheduledFor,
        kitchenHeld: kitchenHeld || undefined,
        orderNo: await Counter.nextOrderNo(settings.timezone),
        createdBy: req.user._id,
      });
    } catch (error) {
      // Two identical sends raced past the findOne; the loser returns the winner's order (no second KOT).
      if (error.code === 11000 && error.keyValue?.clientRequestId) {
        return res.status(200).json({ success: true, message: "Order already created", data: await Order.findOne({ clientRequestId }), replay: true });
      }
      throw error;
    }

    await sendToKitchen(order, [], req.user);

    record(req.user, 'order.create', 'order', order._id, { orderNo: order.orderNo, totalPaise: bills.totalPaise });
    emit('order', { orderId: order._id });
    res.status(201).json({ success: true, message: "Order created successfully!", data: order });
  } catch (error) {
    next(error);
  }
}

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = createHttpError(404, "Invalid id!");
      return next(error);
    }

    const order = await Order.findById(id);
    if (!order) {
      const error = createHttpError(404, "Order not found!");
      return next(error);
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ orderStatus: { $ne: 'completed' } }).populate("table");
    res.status(200).json({ data: orders });
  } catch (error) {
    next(error);
  }
}

const updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = createHttpError(404, "Invalid id!");
      return next(error);
    }

    const update = pickOrderFields(req.body, req.user);
    // shortcut: read-then-write; two tills editing the same order at once can double-send a KOT. Add a version check if that happens.
    const before = await Order.findById(id).select('items adjustments paidPaise paymentStatus acceptance type');
    if (!before) return next(createHttpError(404, "Order not found!"));
    assertAccepted(before);
    if (req.body.items !== undefined) {
      if (before.paymentStatus === 'Paid') return next(createHttpError(409, 'Order is already paid; start a new order'));
      const { items, bills } = await priceOrder(req.body.items, before.toObject().adjustments, before.items);
      if (bills.totalPaise < (before.paidPaise || 0)) return next(createHttpError(400, 'Bill would be less than what was already paid'));
      update.items = items;
      update.bills = bills;
    }

    const order = await Order.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!order) {
      return next(createHttpError(404, "Order not found!"));
    }
    if (update.items) await sendToKitchen(order, before.items, req.user);

    record(req.user, 'order.update', 'order', order._id, {
      orderNo: order.orderNo,
      fields: Object.keys(update),
      orderStatus: update.orderStatus,
      totalPaise: update.bills?.totalPaise,
    });
    emit('order', { orderId: order._id });
    res.status(200).json({ success: true, message: "Order updated", data: order });
  } catch (error) {
    next(error);
  }
};

const deleteItemFromOrder = async (req, res, next) => {
    try {
        const { orderId, itemId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return next(createHttpError(404, "Invalid orderId!"));
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return next(createHttpError(404, "Order not found!"));
        }

        // Cart line ids can be floats (Date.now() + Math.random()), so compare as strings, not parseInt.
        if (order.paymentStatus === 'Paid') return next(createHttpError(409, 'Order is already paid'));
        assertAccepted(order);
        const before = order.items;
        const remaining = order.items.filter(item => String(item.id) !== String(itemId));
        const { items, bills } = await priceOrder(remaining, order.toObject().adjustments, before);
        if (bills.totalPaise < (order.paidPaise || 0)) return next(createHttpError(400, 'Bill would be less than what was already paid'));
        order.items = items;
        order.bills = bills;
        await order.save();
        await sendToKitchen(order, before, req.user);

        record(req.user, 'order.item.remove', 'order', order._id, { orderNo: order.orderNo, lineId: itemId });
        emit('order', { orderId: order._id });
        res.status(200).json({ success: true, message: "Item removed from order", data: order });
    } catch (error) {
        next(error);
    }
};

const getOrderByTable = async (req, res, next) => {
  try {
    const { tableId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return next(createHttpError(404, "Invalid table id!"));
    }
    const order = await Order.findOne({ table: tableId, orderStatus: OPEN, acceptance: { $ne: 'Pending' } }).sort({ createdAt: -1 });

    if (!order) {
      return next(createHttpError(404, 'Order not found'));
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

const releaseTable = async (order) => {
  if (!order.table) return;
  const { modifiedCount } = await Table.updateOne({ _id: order.table, currentOrder: order._id }, Table.FREE);
  if (modifiedCount) emit('table', { tableId: order.table });
};

// Loads an order that can still be changed: open and nothing paid yet.
const openUnpaidOrder = async (id, what) => {
  if (!mongoose.isValidObjectId(id)) throw createHttpError(404, `${what} not found`);
  const order = await Order.findById(id);
  if (!order) throw createHttpError(404, `${what} not found`);
  if (['Completed', 'Cancelled'].includes(order.orderStatus)) throw createHttpError(409, `${what} is already closed`);
  if ((order.paidPaise || 0) > 0) throw createHttpError(409, `${what} has payments; refund them first`);
  return order;
};

// Moves every line of source into target and closes source. kitchen: 'move' re-points source's existing
// tickets (food already sent); 'send' creates tickets for the new lines (a guest order the kitchen hasn't seen).
const mergeInto = async (target, source, user, kitchen) => {
  // Line ids only need to be unique within an order; re-number the source's if they clash.
  const taken = new Set(target.items.map((l) => String(l.id)));
  const incoming = source.items.map((l) => (taken.has(String(l.id)) ? { ...l, id: `${l.id}-m${source.orderNo || source._id}` } : l));
  const combined = [...target.items, ...incoming];
  // prevItems = combined: the food is already ordered, so sold-out and required add-on rules don't apply again.
  const { items, bills } = await priceOrder(combined, target.toObject().adjustments, combined);

  const merged = await Order.findOneAndUpdate(
    { _id: target._id, paidPaise: target.paidPaise || { $in: [0, null] }, orderStatus: OPEN },
    { items, bills, orderStatus: 'In Progress' },
    { new: true }
  );
  if (!merged) throw createHttpError(409, 'Order changed; reload and try again');
  await Order.updateOne(
    { _id: source._id },
    { orderStatus: 'Cancelled', cancel: { reason: `Merged into ${target.orderNo}`, by: user._id, at: new Date(), mergedInto: target._id } }
  );
  if (kitchen === 'send') {
    await sendToKitchen(merged, target.items, user);
  } else {
    const table = merged.table ? await Table.findById(merged.table).select('tableNo') : null;
    await Kot.updateMany({ order: source._id }, { order: target._id, orderNo: target.orderNo, tableNo: table?.tableNo });
    await releaseTable(source);
    if (await Kot.exists({ order: target._id, status: { $in: ['New', 'Preparing'] } })) {
      await Order.updateOne({ _id: target._id, orderStatus: 'Ready' }, { orderStatus: 'In Progress' });
    }
    emit('kot');
  }
  emit('order', { orderId: target._id });
  return merged;
};

// POST /api/order/:id/cancel { reason } — the kitchen gets cancel tickets, the table is freed.
const cancelOrder = async (req, res, next) => {
  try {
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 200) : '';
    if (!reason) return next(createHttpError(400, 'Give a reason for cancelling'));
    const order = await openUnpaidOrder(req.params.id, 'Order');
    assertAccepted(order);

    const cancelled = await Order.findOneAndUpdate(
      { _id: order._id, orderStatus: OPEN, paidPaise: order.paidPaise || { $in: [0, null] } },
      { orderStatus: 'Cancelled', cancel: { reason, by: req.user._id, at: new Date() } },
      { new: true }
    );
    if (!cancelled) return next(createHttpError(409, 'Order changed; reload and try again'));

    // Only food the kitchen hasn't handed over yet needs cancelling.
    const open = await Kot.exists({ order: order._id, status: { $ne: 'Served' } });
    if (open) await sendToKitchen({ ...cancelled.toObject(), items: [] }, cancelled.items, req.user);
    await releaseTable(cancelled);

    record(req.user, 'order.cancel', 'order', cancelled._id, { orderNo: cancelled.orderNo, reason, totalPaise: cancelled.bills?.totalPaise });
    emit('order', { orderId: cancelled._id });
    res.status(200).json({ success: true, message: 'Order cancelled', data: cancelled });
  } catch (error) {
    next(error);
  }
};

// POST /api/order/:id/move { tableId } — move a dine-in order to a free table.
const moveOrder = async (req, res, next) => {
  try {
    const { tableId } = req.body;
    if (!mongoose.isValidObjectId(tableId)) return next(createHttpError(400, 'Pick a table'));
    if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, 'Order not found'));
    const order = await Order.findById(req.params.id);
    if (!order || ['Completed', 'Cancelled'].includes(order.orderStatus)) return next(createHttpError(404, 'Open order not found'));
    if (String(order.table) === String(tableId)) return next(createHttpError(400, 'Order is already on that table'));
    assertAccepted(order);

    // Claim the new table only if it's free, so two waiters can't seat two orders on it.
    const target = await Table.findOneAndUpdate(
      { _id: tableId, status: { $ne: 'Booked' } },
      { status: 'Booked', currentOrder: order._id },
      { new: true }
    );
    if (!target) return next(createHttpError(409, 'That table is not free'));

    await releaseTable(order);
    const moved = await Order.findByIdAndUpdate(order._id, { table: target._id, type: 'Dine-in' }, { new: true });
    await Kot.updateMany({ order: order._id }, { tableNo: target.tableNo });

    record(req.user, 'order.move', 'order', order._id, { orderNo: order.orderNo, toTable: target.tableNo });
    emit('table', { tableId: target._id });
    emit('order', { orderId: order._id });
    emit('kot');
    res.status(200).json({ success: true, message: `Moved to table ${target.tableNo}`, data: moved });
  } catch (error) {
    next(error);
  }
};

// POST /api/order/:id/merge { fromOrderId } — move every line of another unpaid order into this one.
const mergeOrder = async (req, res, next) => {
  try {
    const target = await openUnpaidOrder(req.params.id, 'Order');
    const source = await openUnpaidOrder(req.body.fromOrderId, 'Order to merge');
    if (String(source._id) === String(target._id)) return next(createHttpError(400, 'Pick a different order'));
    assertAccepted(target);
    assertAccepted(source);
    const merged = await mergeInto(target, source, req.user, 'move');
    record(req.user, 'order.merge', 'order', target._id, { orderNo: target.orderNo, from: source.orderNo });
    res.status(200).json({ success: true, message: `Merged ${source.orderNo} into ${target.orderNo}`, data: merged });
  } catch (error) {
    next(error);
  }
};

// POST /api/order/:id/accept — a guest QR order goes to the kitchen. If the table already has an open
// order, the guest's items join it (one bill per table); otherwise this becomes the table's order.
// POST /api/order/:id/release — send a scheduled order to the kitchen now (guest came early).
const releaseNow = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return next(createHttpError(404, 'Order not found'));
    const order = await scheduler.release(req.params.id);
    if (!order) return next(createHttpError(409, 'This order is not waiting to be sent'));
    record(req.user, 'order.release', 'order', order._id, { orderNo: order.orderNo });
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

const acceptGuestOrder = async (req, res, next) => {
  try {
    const guest = await openUnpaidOrder(req.params.id, 'Guest order');
    if (guest.acceptance !== 'Pending') return next(createHttpError(409, 'Already handled'));
    const claimed = await Order.findOneAndUpdate({ _id: guest._id, acceptance: 'Pending' }, { acceptance: 'Accepted' }, { new: true });
    if (!claimed) return next(createHttpError(409, 'Already handled on another screen'));

    const table = await Table.findById(claimed.table);
    const current = table?.currentOrder && (await Order.findOne({ _id: table.currentOrder, orderStatus: OPEN }));
    let result;
    if (current && !(current.paidPaise > 0)) {
      result = await mergeInto(current, claimed, req.user, 'send');
    } else {
      if (table && !current) await Table.updateOne({ _id: table._id }, { status: 'Booked', currentOrder: claimed._id });
      await sendToKitchen(claimed, [], req.user);
      result = claimed;
      emit('order', { orderId: claimed._id });
    }
    emit('table', { tableId: claimed.table });
    record(req.user, 'order.accept', 'order', claimed._id, { orderNo: claimed.orderNo, into: result.orderNo });
    res.status(200).json({ success: true, message: 'Sent to the kitchen', data: result });
  } catch (error) {
    next(error);
  }
};

// POST /api/order/:id/decline { reason }
const declineGuestOrder = async (req, res, next) => {
  try {
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 200) : '';
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, acceptance: 'Pending' },
      { acceptance: 'Declined', orderStatus: 'Cancelled', cancel: { reason: reason || 'Declined', by: req.user._id, at: new Date() } },
      { new: true }
    );
    if (!order) return next(createHttpError(409, 'Already handled'));
    record(req.user, 'order.decline', 'order', order._id, { orderNo: order.orderNo, reason });
    emit('order', { orderId: order._id });
    res.status(200).json({ success: true, message: 'Guest order declined', data: order });
  } catch (error) {
    next(error);
  }
};

// POST /api/order/:id/checkout { requestId, adjustments?, payments: [{ method, amountPaise, tenderedPaise? }], dryRun? }
// dryRun returns the bill for the given discount/tip without saving. payments: [] just saves discount/tip.
const checkout = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return next(createHttpError(404, 'Order not found'));
    // cleanAdjustments drops anything else the client sends; applyPayments puts the order's delivery fee back.
    const adjustments = req.body.adjustments === undefined ? undefined : cleanAdjustments(req.body.adjustments);

    if (req.body.dryRun) {
      const order = await Order.findById(id);
      if (!order) return next(createHttpError(404, 'Order not found'));
      const bills = await billsFor(order, withFee(order, adjustments));
      return res.status(200).json({
        success: true,
        data: {
          bills,
          paidPaise: order.paidPaise || 0,
          duePaise: bills.totalPaise - (order.paidPaise || 0),
        },
      });
    }

    const requestId = typeof req.body.requestId === 'string' ? req.body.requestId.slice(0, 100) : '';
    if (requestId.length < 8) return next(createHttpError(400, 'requestId is required'));
    const payments = cleanPayments(req.body.payments ?? [], req.user);

    const { order, replay } = await applyPayments(id, { requestId, adjustments, payments });
    if (!replay) {
      record(req.user, 'order.checkout', 'order', order._id, {
        orderNo: order.orderNo,
        payments: payments.map(({ method, amountPaise }) => ({ method, amountPaise })),
        discountPaise: order.bills?.discountPaise,
        discountReason: order.adjustments?.discountReason,
        tipPaise: order.bills?.tipPaise,
        paymentStatus: order.paymentStatus,
      });
    }
    res.status(200).json({ success: true, message: order.paymentStatus === 'Paid' ? 'Payment complete' : 'Saved', data: order, replay });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  releaseNow,
  acceptGuestOrder,
  declineGuestOrder,
  cancelOrder,
  moveOrder,
  mergeOrder,
  checkout,
  addOrder,
  getOrders,
  updateOrder,
  getOrderById,
  getOrderByTable,
  deleteItemFromOrder,
  previewPrice
}
