const express = require('express');
const router = express.Router();
const {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

const manage = [isVerifiedUser, requirePermission('menu.manage')];

router.route('/').post(manage, createCategory);
router.route('/').get(getCategories);
router.route('/:id').get(getCategoryById);
router.route('/:id').put(manage, updateCategory);
router.route('/:id').delete(manage, deleteCategory);

module.exports = router;
