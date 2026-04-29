const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const ctrl = require('../controllers/chat.controller');

router.use(authRequired);
router.get('/history', ctrl.history);
router.get('/threads', ctrl.threads);

module.exports = router;
