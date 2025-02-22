const Order = require('../models/orderModel');

const addOrder = async (req, res, next) => {
    try {
        const order = new Order(req.body);
        await order.save();

        res.status(201).json({
            success: true,
            data: order,
            message: "Order created successfully"
        });
    } catch (error) {
        next(error);
    }
}

const getOrderById = async (req, res, next) => {
    try {

        const { id } = req.params;

        if (!mongoose.Types.objectId.isValid(id)) {
            const error = createHttpError(400, "Invalid order id");
            return next(error);
        }

        const order = await Order.findById(id);

        if (!order) {
            const error = createHttpError(404, "Order not found");
            return next(error);
        }

        res.status(200).json({
            success: true,
            data: order,
            // message: "Order fetched successfully"
        });

    } catch (error) {
        next(error);
    }
}

const getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find();
        res.status(200).json({
            success: true,
            data: orders,
        })

    } catch (error) {
        next(error);
    }
}

const updateOrder = async (req, res, next) => {
    try {

        const { orderStatus } = req.body;
        const { id } = req.params;

        if (!mongoose.Types.objectId.isValid(id)) {
            const error = createHttpError(400, "Invalid order id");
            return next(error);
        }

        const order = await Order.findByIdAndUpdate(id, { orderStatus }, { new: true });

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



module.exports = {
    addOrder,
    getOrders,
    updateOrder,
    getOrderById
}