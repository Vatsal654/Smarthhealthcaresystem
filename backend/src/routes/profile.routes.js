const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const ctrl = require('../controllers/profile.controller');

router.use(authRequired);
router.get('/', ctrl.getProfile);
router.put('/', ctrl.upsertProfile);

module.exports = router;
