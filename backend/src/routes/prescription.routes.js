const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const ctrl = require('../controllers/prescription.controller');

router.use(authRequired);
router.post('/', ctrl.create);
router.get('/mine', ctrl.mine);
router.get('/by-appointment/:appointmentId', ctrl.byAppointment);
router.get('/:id', ctrl.get);

module.exports = router;
