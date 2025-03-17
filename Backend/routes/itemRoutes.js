const express = require('express');
const router = express.Router();
const {
    createItem,
    getItems,
    getItemById,
    updateItem,
    deleteItem,
    getPopularDishes // Importing the new function
} = require('../controllers/itemController');
const { isVerifiedUser } = require('../middlewares/tokenVerification');

router.route('/').post(isVerifiedUser, createItem);
router.route('/').get(getItems);
router.route('/:id').get(getItemById);
router.route('/:id').put(isVerifiedUser, updateItem);
router.route('/popular-dishes').get(getPopularDishes); // New route for fetching popular dishes
router.route('/popular-dishes').get(getPopularDishes); // New route for fetching popular dishes
router.route('/:id').delete(isVerifiedUser, deleteItem);

module.exports = router;
