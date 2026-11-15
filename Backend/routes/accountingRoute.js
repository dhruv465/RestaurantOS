const express = require('express');
const router = express.Router();
const c = require('../controllers/accountingController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

router.use(isVerifiedUser, requirePermission('accounting.manage'));
router.get('/expenses', c.listExpenses);
router.post('/expenses', c.addExpense);
router.patch('/expenses/:id', c.editExpense);
router.delete('/expenses/:id', c.deleteExpense);
router.get('/closing/preview', c.closingPreview);
router.get('/closings', c.listClosings);
router.post('/closings', c.closeDay);
router.get('/pnl', c.pnl);
router.get('/gst', c.gst);

module.exports = router;
