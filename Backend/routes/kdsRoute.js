const express = require('express');
const router = express.Router();
const { getTickets, updateTicketStatus, setTicketPriority } = require('../controllers/kdsController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

const kitchen = [isVerifiedUser, requirePermission('kitchen.manage')];

router.get('/tickets', kitchen, getTickets);
router.patch('/tickets/:id/status', kitchen, updateTicketStatus);
router.patch('/tickets/:id/priority', kitchen, setTicketPriority);

module.exports = router;
