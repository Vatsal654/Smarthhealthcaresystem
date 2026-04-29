const router = require('express').Router();
const rateLimit = require('express-rate-limit');

const { signup, login, me } = require('../controllers/auth.controller');
const { authRequired } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { signupSchema, loginSchema } = require('../validators/auth.schema');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 });

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', authRequired, me);

module.exports = router;
