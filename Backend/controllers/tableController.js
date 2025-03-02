const Table = require('../models/tableModel');
const createHttpError = require('http-errors');
const { deleteOrdersByTableId } = require('./orderController');
const mongoose = require('mongoose');

const addTable = async (req, res, next) => {
    try {
        const { tableNo, seats } = req.body;

        if (!tableNo) {
            const error = createHttpError(400, "Please provide table No!");
            return next(error);
        }

        const isTablePresent = await Table.findOne({ tableNo });

        if (isTablePresent) {
            const error = createHttpError(400, "Table already exists");
            return next(error);
        }

        const newTable = new Table({ tableNo, seats });
        await newTable.save();

        res.status(201).json({
            success: true,
            data: newTable,
            message: "Table created successfully"
        });
    } catch (error) {
        next(error);
    }
}

const getTables = async (req, res, next) => {
    try {
        const tables = await Table.find().populate({
            path: "currentOrder",
            select: "customerDetails"
        });
        res.status(200).json({
            success: true,
            data: tables
        });
    } catch (error) {
        next(error);
    }
}

const updateTable = async (req, res, next) => {
    try {
        const { status, orderId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return next(createHttpError(400, "Invalid Order ID format"));
        }

        if (status === "Available") {
            await deleteOrdersByTableId(req.params.id);
        }
        const updateData = {
            status,
            currentOrder: orderId
        };

        const table = await Table.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!table) {
            return next(createHttpError(404, "Table not found"));
        }

        res.status(200).json({
            success: true,
            message: "Table updated successfully",
            data: table
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    addTable,
    getTables,
    updateTable
}
