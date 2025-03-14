const Category = require('../models/categoryModel');
const createHttpError = require('http-errors');

const createCategory = async (req, res, next) => {
    try {
        const newCategory = await Category.create(req.body);
        res.status(201).json({ success: true, message: 'Category created', data: newCategory });
    } catch (error) {
        next(error);
    }
};

const getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find();
        res.status(200).json({ message: 'Categories fetched', data: categories });
    } catch (error) {
        next(error);
    }
};

const getCategoryById = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return next(createHttpError(404, 'Category not found'));
        }
        res.status(200).json({ message: 'Category fetched', data: category });
    } catch (error) {
        next(error);
    }
};

const updateCategory = async (req, res, next) => {
    try {
        const updatedCategory = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedCategory) {
            return next(createHttpError(404, 'Category not found'));
        }
        res.status(200).json({ message: 'Category updated', data: updatedCategory });
    } catch (error) {
        next(error);
    }
};

const deleteCategory = async (req, res, next) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) {
            return next(createHttpError(404, 'Category not found'));
        }
        res.status(200).json({ message: 'Category deleted', data: deletedCategory });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};