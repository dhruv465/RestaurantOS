const express = require('express');
const router = express.Router();
const {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');
const { isVerifiedUser } = require('../middlewares/tokenVerification');

router.route('/').post(isVerifiedUser, createCategory);
router.route('/').get(getCategories);
router.route('/:id').get(getCategoryById);
router.route('/:id').put(isVerifiedUser, updateCategory);
router.route('/:id').delete(isVerifiedUser, deleteCategory);

module.exports = router;