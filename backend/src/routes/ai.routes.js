const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { authRequired } = require('../middleware/auth');
const ctrl = require('../controllers/ai.controller');

const aiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30 });

router.post('/analyze', aiLimiter, authRequired, ctrl.analyze);
router.get('/reports', authRequired, ctrl.listReports);
router.get('/reports/:id', authRequired, ctrl.getReport);
router.get('/diseases', ctrl.diseases);

module.exports = router;
