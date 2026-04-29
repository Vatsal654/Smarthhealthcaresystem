const router = require('express').Router();
const { authRequired, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/doctor.controller');

router.get('/specialties', ctrl.specialties);
router.get('/', ctrl.listDoctors);
router.get('/me/profile', authRequired, requireRole('doctor'), ctrl.getMyDoctorProfile);
router.patch('/me/profile', authRequired, requireRole('doctor'), ctrl.updateMyDoctorProfile);
router.get('/:id', ctrl.getDoctor);

module.exports = router;
