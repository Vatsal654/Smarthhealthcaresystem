const router = require('express').Router();
const { authRequired } = require('../middleware/auth');
const { updateMe, changePassword } = require('../controllers/user.controller');

router.patch('/me', authRequired, updateMe);
router.post('/change-password', authRequired, changePassword);

module.exports = router;
