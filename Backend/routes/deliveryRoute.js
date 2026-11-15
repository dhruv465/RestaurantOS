const express = require('express');
const router = express.Router();
const c = require('../controllers/deliveryController');
const { isVerifiedUser, requirePermission, requireAnyPermission } = require('../middlewares/tokenVerification');

const manage = requirePermission('delivery.manage');
router.use(isVerifiedUser);
router.get('/zones', requirePermission('orders.view'), c.listZones);
router.post('/zones', manage, c.saveZone);
router.patch('/zones/:id', manage, c.saveZone);
router.get('/board', manage, c.board);
router.get('/mine', requirePermission('delivery.rider'), c.mine);
router.post('/:orderId/assign', manage, c.assign);
router.post('/:orderId/status', requireAnyPermission('delivery.manage', 'delivery.rider'), c.setStatus);

module.exports = router;
