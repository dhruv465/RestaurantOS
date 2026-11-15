const express = require('express');
const router = express.Router();
const { getMenu, join, isGuest, placeOrder, myOrders, callStaff, kioskMenu, kioskOrder } = require('../controllers/publicController');

// No staff login on these: guests reach them from a table QR.
router.get('/menu/:qrToken', getMenu);
router.post('/menu/:qrToken/join', join);
router.post('/order', isGuest, placeOrder);
router.get('/orders', isGuest, myOrders);
router.post('/request', isGuest, callStaff);
router.get('/kiosk/:token/menu', kioskMenu);
router.post('/kiosk/:token/order', kioskOrder);

module.exports = router;
