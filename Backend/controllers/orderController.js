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
        const orders = await Order.find().populate("table");
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
  
      res
        .status(200)
        .json({ success: true, message: "Order updated", data: order });
    } catch (error) {
      next(error);
    }
};

const deleteOrdersByTableId = async (tableId) => {
    try {
        await Order.deleteMany({ table: tableId });
    } catch (error) {
        throw error;
    }
};

const getOrderByTable = async (req, res, next) => {
    try {
      const orderId = req.params.tableId; // Assuming tableId is passed as a parameter
      const order = await Order.findOne({ table: orderId }).populate('items'); // Populate items if needed
  
      if (!order) {
        return next(createHttpError(404, 'Order not found'));
      }
  
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
};

module.exports = {
    deleteOrdersByTableId,
    addOrder,
    getOrders,
    updateOrder,
    getOrderById,
    getOrderByTable
}
