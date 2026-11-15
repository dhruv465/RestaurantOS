const express = require('express');
const router = express.Router();
const c = require('../controllers/reservationController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

// Front-of-house work: anyone who can take orders can book and seat guests.
const floor = [isVerifiedUser, requirePermission('orders.manage')];

router.get('/', floor, c.listReservations);
router.post('/', floor, c.createReservation);
router.patch('/:id', floor, c.updateReservation);
router.get('/waitlist', floor, c.listWaitlist);
router.post('/waitlist', floor, c.addToWaitlist);
router.patch('/waitlist/:id', floor, c.updateWaitlist);

module.exports = router;
