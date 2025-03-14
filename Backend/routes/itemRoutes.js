const express = require('express');
const router = express.Router();
const {
    createItem,
    getItems,
    getItemById,
    updateItem,
    deleteItem
} = require('../controllers/itemController');
const { isVerifiedUser } = require('../middlewares/tokenVerification');

router.route('/').post(isVerifiedUser, createItem);
router.route('/').get(getItems);
router.route('/:id').get(getItemById);
router.route('/:id').put(isVerifiedUser, updateItem);
router.route('/:id').delete(isVerifiedUser, deleteItem);

module.exports = router;