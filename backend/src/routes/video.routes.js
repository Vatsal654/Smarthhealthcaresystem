const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const ctrl = require('../controllers/video.controller');

router.post('/token', authRequired, ctrl.getToken);

module.exports = router;
