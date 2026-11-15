const Item = require('../models/itemModel');
const createHttpError = require('http-errors');
const { record } = require('../utils/audit');
const { emit } = require('../utils/realtime');

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
        record(req.user, 'item.create', 'item', newItem._id, { name: newItem.name });
        emit('menu');
        res.status(201).json({ message: 'Item created', data: newItem });
    } catch (error) {
        next(error);
    }
};

const getItems = async (req, res, next) => {
    try {
        const items = await Item.find().sort({ sortOrder: 1, name: 1 }).populate('category', 'name');
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
        const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedItem) {
            return next(createHttpError(404, 'Item not found'));
        }
        record(req.user, 'item.update', 'item', updatedItem._id, { name: updatedItem.name });
        emit('menu');
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
        record(req.user, 'item.delete', 'item', deletedItem._id, { name: deletedItem.name });
        emit('menu');
        res.status(200).json({ message: 'Item deleted', data: deletedItem });
    } catch (error) {
        next(error);
    }
};

// POST /api/items/upload-image (multipart "image") -> { url }. The item stores the url on save.
const uploadImage = (req, res, next) => {
    if (!req.file) return next(createHttpError(400, 'Choose a JPG, PNG or WebP image under 2 MB'));
    res.status(201).json({ success: true, url: `/uploads/items/${req.file.filename}` });
};

module.exports = {
    uploadImage,
    getPopularDishes,
    createItem,
    getItems,
    getItemById,
    updateItem,
    deleteItem
};
