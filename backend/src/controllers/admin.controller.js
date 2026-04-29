const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Disease = require('../models/Disease');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.stats = asyncHandler(async (req, res) => {
  const [users, doctors, pendingDoctors, appointments, diseases] = await Promise.all([
    User.countDocuments({ role: 'patient' }),
    Doctor.countDocuments({ verificationStatus: 'verified' }),
    Doctor.countDocuments({ verificationStatus: 'pending' }),
    Appointment.countDocuments(),
    Disease.countDocuments(),
  ]);
  res.json({ users, doctors, pendingDoctors, appointments, diseases });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const { role, q, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();
  res.json({ users });
});

exports.toggleUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound();
  user.disabled = !user.disabled;
  await user.save();
  res.json({ user: user.toSafeJSON() });
});

exports.listPendingDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find({ verificationStatus: 'pending' })
    .populate('user', 'name email avatarUrl')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ doctors });
});

exports.verifyDoctor = asyncHandler(async (req, res) => {
  const { decision, reason } = req.body; // 'verified' | 'rejected'
  if (!['verified', 'rejected'].includes(decision)) {
    throw ApiError.badRequest('decision must be verified or rejected');
  }
  const doctor = await Doctor.findByIdAndUpdate(
    req.params.id,
    { verificationStatus: decision, rejectionReason: reason },
    { new: true }
  ).populate('user', 'name email');
  if (!doctor) throw ApiError.notFound();
  res.json({ doctor });
});
