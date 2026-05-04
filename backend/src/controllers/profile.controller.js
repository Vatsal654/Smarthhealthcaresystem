const MedicalProfile = require('../models/MedicalProfile');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.getProfile = asyncHandler(async (req, res) => {
  const profile =
    (await MedicalProfile.findOne({ user: req.user.id }).lean()) || null;
  res.json({ profile });
});

exports.upsertProfile = asyncHandler(async (req, res) => {
  const allowed = [
    'age',
    'gender',
    'bloodGroup',
    'heightCm',
    'weightKg',
    'allergies',
    'chronicConditions',
    'currentMedications',
    'pastSurgeries',
    'emergencyContact',
  ];
  const updates = {};
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });

  const profile = await MedicalProfile.findOneAndUpdate(
    { user: req.user.id },
    { $set: updates, $setOnInsert: { user: req.user.id } },
    { new: true, upsert: true }
  );
  res.json({ profile });
});

// Doctor-only: view a patient's medical profile
exports.getPatientProfile = asyncHandler(async (req, res) => {
  if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
    throw ApiError.forbidden('Only doctors can view patient profiles');
  }
  const patient = await User.findById(req.params.userId).lean();
  if (!patient || patient.role !== 'patient') throw ApiError.notFound('Patient not found');
  const profile = (await MedicalProfile.findOne({ user: req.params.userId }).lean()) || null;
  res.json({ patient: { name: patient.name, email: patient.email }, profile });
});
