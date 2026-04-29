const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.updateMe = asyncHandler(async (req, res) => {
  const updates = {};
  ['name', 'phone', 'avatarUrl'].forEach((k) => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
  if (!user) throw ApiError.notFound();
  res.json({ user: user.toSafeJSON() });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    throw ApiError.badRequest('New password must be at least 8 characters');
  }
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) throw ApiError.notFound();

  const ok = await user.verifyPassword(currentPassword || '');
  if (!ok) throw ApiError.unauthorized('Current password incorrect');

  await user.setPassword(newPassword);
  await user.save();
  res.json({ ok: true });
});
