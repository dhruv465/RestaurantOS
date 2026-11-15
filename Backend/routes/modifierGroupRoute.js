const express = require('express');
const router = express.Router();
const { listGroups, createGroup, updateGroup, deleteGroup } = require('../controllers/modifierGroupController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

const manage = [isVerifiedUser, requirePermission('menu.manage')];

router.get('/', isVerifiedUser, listGroups);
router.post('/', manage, createGroup);
router.put('/:id', manage, updateGroup);
router.delete('/:id', manage, deleteGroup);

module.exports = router;
