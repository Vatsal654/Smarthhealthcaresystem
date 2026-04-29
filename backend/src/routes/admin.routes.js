const router = require('express').Router();
const { authRequired, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/admin.controller');

router.use(authRequired, requireRole('admin'));

router.get('/stats', ctrl.stats);
router.get('/users', ctrl.listUsers);
router.post('/users/:id/toggle', ctrl.toggleUser);
router.get('/doctors/pending', ctrl.listPendingDoctors);
router.post('/doctors/:id/verify', ctrl.verifyDoctor);

module.exports = router;
