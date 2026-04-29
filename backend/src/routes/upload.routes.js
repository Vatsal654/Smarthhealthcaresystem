const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const ctrl = require('../controllers/upload.controller');

router.post('/', authRequired, ctrl.middleware, ctrl.handle);

module.exports = router;
