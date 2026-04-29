const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) throw ApiError.unauthorized('Missing token');

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();

    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.disabled) throw ApiError.forbidden('Account disabled');

    req.user = {
      id: String(user._id),
      role: user.role,
      email: user.email,
      name: user.name,
    };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Insufficient role'));
    next();
  };
}

module.exports = { authRequired, requireRole };
