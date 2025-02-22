const Table = require('../models/tableModel');
const createHttpError = require('http-errors');
const mongoose = require('mongoose');

const createTable = async (req, res, next) => {
    try {
        const { tableNo } = req.body;

        if (!tableNo) {
            const error = createHttpError(400, "Table number is required");
            return next(error);
        }

        const isTablePresent = await Table.findOne({ tableNo });

        if (isTablePresent) {
            const error = createHttpError(400, "Table already exists");
            return next(error);
        }

        const newTable = new Table({ tableNo });
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

        const tables = await Table.find();

        // Removed the line that fetches the updated table
        res.status(200).json({
            orderId: orderId,
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

        const { id } = req.params;

        if (!mongoose.Types.objectId.isValid(id)) {
            const error = createHttpError(400, "Invalid order id");
            return next(error);
        }

        const table = await Table.findByIdAndUpdate(id, { status, currentOrder: orderId }, { new: true });

        if (!table) {
            const error = createHttpError(404, "Table not found");
            return next(error);
        }

        res.status(200).json({
            success: true,
            data: table,
            message: "Table updated successfully"
        });

    } catch (error) {

    }
}

module.exports = {
    createTable,
    getTables,
    updateTable
}
