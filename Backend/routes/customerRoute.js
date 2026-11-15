const express = require('express');
const router = express.Router();
const { listCustomers, createCustomer, getCustomer, updateCustomer, adjustPoints } = require('../controllers/customerController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

router.use(isVerifiedUser);
router.get('/', requirePermission('orders.view'), listCustomers);
router.post('/', requirePermission('orders.manage'), createCustomer);
router.get('/:id', requirePermission('orders.view'), getCustomer);
router.patch('/:id', requirePermission('orders.manage'), updateCustomer);
router.post('/:id/points', requirePermission('loyalty.adjust'), adjustPoints);

module.exports = router;
