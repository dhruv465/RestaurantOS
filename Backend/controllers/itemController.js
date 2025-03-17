const Item = require('../models/itemModel');
const createHttpError = require('http-errors');

const getPopularDishes = async (req, res, next) => {
    try {
        const popularDishes = await Item.find(); // Fetching all items from the items table
        res.status(200).json({ message: 'Popular dishes fetched', data: popularDishes });
    } catch (error) {
        next(error);
    }
};

const createItem = async (req, res, next) => {
    try {
        const newItem = await Item.create(req.body);
        res.status(201).json({ message: 'Item created', data: newItem });
    } catch (error) {
        next(error);
    }
};

const getItems = async (req, res, next) => {
    try {
        const items = await Item.find().populate('category', 'name');
        res.status(200).json({ message: 'Items fetched', data: items });
    } catch (error) {
        next(error);
    }
};

const getItemById = async (req, res, next) => {
    try {
        const item = await Item.findById(req.params.id).populate('category', 'name');
        if (!item) {
            return next(createHttpError(404, 'Item not found'));
        }
        res.status(200).json({ message: 'Item fetched', data: item });
    } catch (error) {
        next(error);
    }
};

const updateItem = async (req, res, next) => {
    try {
        const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedItem) {
            return next(createHttpError(404, 'Item not found'));
        }
        res.status(200).json({ message: 'Item updated', data: updatedItem });
    } catch (error) {
        next(error);
    }
};

const deleteItem = async (req, res, next) => {
    try {
        const deletedItem = await Item.findByIdAndDelete(req.params.id);
        if (!deletedItem) {
            return next(createHttpError(404, 'Item not found'));
        }
        res.status(200).json({ message: 'Item deleted', data: deletedItem });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPopularDishes,
    createItem,
    getItems,
    getItemById,
    updateItem,
    deleteItem
};
