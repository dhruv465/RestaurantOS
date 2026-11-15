const express = require('express');
const router = express.Router();
const {
    createItem,
    getItems,
    getItemById,
    updateItem,
    deleteItem,
    getPopularDishes,
    uploadImage
} = require('../controllers/itemController');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const createHttpError = require('http-errors');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

const manage = [isVerifiedUser, requirePermission('menu.manage')];

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
    storage: multer.diskStorage({
        destination: path.join(__dirname, '..', 'uploads', 'items'),
        // Random name + extension from the checked type, never the client's filename.
        filename: (req, file, cb) => cb(null, crypto.randomUUID() + IMAGE_TYPES[file.mimetype]),
    }),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) =>
        IMAGE_TYPES[file.mimetype] ? cb(null, true) : cb(createHttpError(400, 'Only JPG, PNG or WebP images')),
});
const uploadErrors = (err, req, res, next) =>
    next(err instanceof multer.MulterError ? createHttpError(400, err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 2 MB' : err.message) : err);

// /popular-dishes must come before /:id, or /:id swallows it.
router.route('/popular-dishes').get(getPopularDishes);
router.post('/upload-image', manage, upload.single('image'), uploadErrors, uploadImage);
router.route('/').post(manage, createItem);
router.route('/').get(getItems);
router.route('/:id').get(getItemById);
router.route('/:id').put(manage, updateItem);
router.route('/:id').delete(manage, deleteItem);

module.exports = router;
