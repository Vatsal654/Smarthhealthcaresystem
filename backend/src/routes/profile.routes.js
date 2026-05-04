const router = require('express').Router();
const { authRequired, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/profile.controller');

router.use(authRequired);
router.get('/', ctrl.getProfile);
router.put('/', ctrl.upsertProfile);
router.get('/patient/:userId', requireRole('doctor', 'admin'), ctrl.getPatientProfile);

module.exports = router;
