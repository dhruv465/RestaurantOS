const express = require('express');
const router = express.Router();
const Item = require('../models/itemModel');
const { isVerifiedUser } = require('../middlewares/tokenVerification');

// Create a new item
router.post('/', isVerifiedUser, async (req, res) => {
    try {
        const newItem = await Item.create(req.body);
        res.status(201).json({ message: 'Item created', data: newItem });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all items
router.get('/', async (req, res) => {
    try {
        const items = await Item.find().populate('category', 'name');
        res.status(200).json({ message: 'Items fetched', data: items });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a specific item by ID
router.get('/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id).populate('category', 'name');
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item fetched', data: item });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update an item
router.put('/:id', isVerifiedUser, async (req, res) => {
    try {
        const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item updated', data: updatedItem });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete an item
router.delete('/:id', isVerifiedUser, async (req, res) => {
    try {
        const deletedItem = await Item.findByIdAndDelete(req.params.id);
        if (!deletedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item deleted', data: deletedItem });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
