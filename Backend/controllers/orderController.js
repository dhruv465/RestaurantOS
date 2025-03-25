const { default: mongoose } = require('mongoose');
const Order = require('../models/orderModel');
const createHttpError = require('http-errors');

const addOrder = async (req, res, next) => {
  try {
    const order = new Order(req.body);
    await order.save();
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
    const { orderStatus } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = createHttpError(404, "Invalid id!");
      return next(error);
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { orderStatus },
      { new: true }
    );

    if (!order) {
      const error = createHttpError(404, "Order not found!");
      return next(error);
    }

    res.status(200).json({ success: true, message: "Order updated", data: order });
  } catch (error) {
    next(error);
  }
};

const deleteItemFromOrder = async (req, res, next) => {
    try {
        const { orderId, itemId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(itemId)) {
            return next(createHttpError(404, "Invalid orderId or itemId!"));
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return next(createHttpError(404, "Order not found!"));
        }

        // Remove the item from the order's items array
        order.items = order.items.filter(item => item.toString() !== itemId);
        await order.save();

        res.status(200).json({ success: true, message: "Item removed from order", data: order });
    } catch (error) {
        next(error);
    }
};

const getOrderByTable = async (req, res, next) => {
  try {
    const orderId = req.params.tableId;
    const order = await Order.findOne({ table: orderId, orderStatus: { $ne: 'completed' } }).populate('items');

    if (!order) {
      return next(createHttpError(404, 'Order not found'));
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addOrder,
  getOrders,
  updateOrder,
  getOrderById,
  getOrderByTable,
  deleteItemFromOrder
}
