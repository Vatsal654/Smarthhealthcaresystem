const MedicalProfile = require('../models/MedicalProfile');
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
