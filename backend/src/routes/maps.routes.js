const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const ctrl = require('../controllers/maps.controller');

router.get('/nearby', authRequired, ctrl.nearby);

module.exports = router;
