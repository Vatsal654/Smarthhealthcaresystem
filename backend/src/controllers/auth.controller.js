const User = require('../models/User');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signAccessToken } = require('../services/token.service');

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, doctor } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('Email already registered');

  const user = new User({ name, email, phone, role });
  await user.setPassword(password);
  await user.save();

  if (role === 'doctor' && doctor) {
    await Doctor.create({
      user: user._id,
      specialization: doctor.specialization,
      degree: doctor.degree,
      licenseNumber: doctor.licenseNumber,
      yearsOfExperience: doctor.yearsOfExperience,
      hospital: doctor.hospital,
      city: doctor.city,
      bio: doctor.bio,
      consultationFee: doctor.consultationFee,
      documents: {
        govtIdUrl: doctor.govtIdUrl,
        certificateUrl: doctor.certificateUrl,
      },
    });
  }

  const token = signAccessToken(user);
  res.status(201).json({ token, user: user.toSafeJSON() });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (user.disabled) throw ApiError.forbidden('Account disabled');

  const ok = await user.verifyPassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  user.lastLoginAt = new Date();
  await user.save();

  const token = signAccessToken(user);
  res.json({ token, user: user.toSafeJSON() });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound();

  let doctor = null;
  if (user.role === 'doctor') {
    doctor = await Doctor.findOne({ user: user._id }).lean();
  }

  res.json({ user: user.toSafeJSON(), doctor });
});
