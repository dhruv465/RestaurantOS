const express = require('express');
const router = express.Router();
const c = require('../controllers/hrController');
const { isVerifiedUser, requirePermission } = require('../middlewares/tokenVerification');

const hr = requirePermission('hr.manage');
const payroll = requirePermission('payroll.manage');
router.use(isVerifiedUser);

router.post('/pin', c.setOwnPin);
router.get('/pin-users', c.pinUsers);
router.post('/pin-switch', c.pinSwitch);

router.get('/attendance/me', c.myAttendance);
router.post('/attendance/clock-in', c.clockIn);
router.post('/attendance/clock-out', c.clockOut);
router.get('/staff', hr, c.staffList);
router.get('/attendance', hr, c.listAttendance);
router.post('/attendance', hr, c.addAttendance);
router.patch('/attendance/:id', hr, c.editAttendance);

router.get('/shifts', requirePermission('orders.view'), c.listShifts);
router.post('/shifts', hr, c.saveShift);
router.put('/shifts/:id', hr, c.saveShift);
router.delete('/shifts/:id', hr, c.deleteShift);

router.get('/leave', c.listLeave);
router.post('/leave', c.requestLeave);
router.patch('/leave/:id', hr, c.decideLeave);

router.get('/payroll/profiles', payroll, c.listProfiles);
router.put('/payroll/profiles/:userId', payroll, c.saveProfile);
router.get('/payroll/runs', payroll, c.listRuns);
router.post('/payroll/runs', payroll, c.createRun);
router.post('/payroll/runs/:id/:action', payroll, c.runAction);
router.delete('/payroll/runs/:id', payroll, c.deleteRun);

module.exports = router;
