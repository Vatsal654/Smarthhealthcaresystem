const router = require('express').Router();
const { authRequired, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/doctor.controller');

router.get('/specialties', ctrl.specialties);
router.get('/emergency', ctrl.emergency);
router.post('/me/availability', authRequired, requireRole('doctor'), ctrl.toggleAvailability);
router.get('/', ctrl.listDoctors);
router.get('/me/profile', authRequired, requireRole('doctor'), ctrl.getMyDoctorProfile);
router.patch('/me/profile', authRequired, requireRole('doctor'), ctrl.updateMyDoctorProfile);
router.get('/me/dashboard', authRequired, requireRole('doctor'), ctrl.myDashboard);
router.get('/me/patients', authRequired, requireRole('doctor'), ctrl.myPatients);
router.get('/mine', authRequired, ctrl.myDoctors); // for patients
router.get('/:id', ctrl.getDoctor);

module.exports = router;
