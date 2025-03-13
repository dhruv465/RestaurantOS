const express = require('express');
const router = express.Router();
const Category = require('../models/categoryModel');
const { isVerifiedUser } = require('../middlewares/tokenVerification');

// Create a new category
router.post('/', isVerifiedUser, async (req, res) => {
  try {
    const newCategory = await Category.create(req.body);
    res.status(201).json({ message: 'Category created', data: newCategory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({ message: 'Categories fetched', data: categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json({ message: 'Category fetched', data: category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a category
router.put('/:id', isVerifiedUser, async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json({ message: 'Category updated', data: updatedCategory });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a category
router.delete('/:id', isVerifiedUser, async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json({ message: 'Category deleted', data: deletedCategory }); 
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
