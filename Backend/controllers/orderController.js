const { default: mongoose } = require('mongoose');
const Order = require('../models/orderModel');
const Table = require('../models/tableModel');
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

        const order = await Order.findById(req.params.id);
        if (!order) {
            return next(createHttpError(404, "Order not found"));
        }

        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
}

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

            return next(createHttpError(404, "Invalid order id"));
        }

        const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus }, { new: true });

        if (!order) {
            const error = createHttpError(404, "Order not found");
            return next(error);
        }

        res.status(200).json({
            success: true,
            data: order,
            message: "Order updated successfully"
        })

    } catch (error) {
        next(error);
    }
}



const deleteOrdersByTableId = async (tableId) => {
    try {
        await Order.deleteMany({ table: tableId });
    } catch (error) {
        throw error;
    }
};

module.exports = {
    deleteOrdersByTableId,
    addOrder,
    getOrders,
    updateOrder,
    getOrderById
}
