const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const ctrl = require('../controllers/appointment.controller');

router.use(authRequired);

router.post('/', ctrl.create);
router.get('/', ctrl.listMine);
router.get('/:id', ctrl.get);
router.patch('/:id/status', ctrl.updateStatus);

module.exports = router;
