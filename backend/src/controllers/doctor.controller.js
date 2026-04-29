const Doctor = require('../models/Doctor');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.listDoctors = asyncHandler(async (req, res) => {
  const { specialization, q, city, page = 1, limit = 20 } = req.query;

  const filter = { verificationStatus: 'verified' };
  if (specialization) filter.specialization = new RegExp(`^${specialization}$`, 'i');
  if (city) filter.city = new RegExp(city, 'i');

  let query = Doctor.find(filter).populate('user', 'name email avatarUrl');

  const docs = await query
    .sort({ rating: -1, createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  let result = docs;
  if (q) {
    const re = new RegExp(q, 'i');
    result = docs.filter(
      (d) =>
        re.test(d.user?.name || '') ||
        re.test(d.specialization) ||
        re.test(d.hospital || '') ||
        re.test(d.city || '')
    );
  }

  res.json({ doctors: result, page: Number(page), limit: Number(limit) });
});

exports.getDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate(
    'user',
    'name email avatarUrl'
  );
  if (!doctor) throw ApiError.notFound('Doctor not found');
  res.json({ doctor });
});

exports.getMyDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user.id }).populate(
    'user',
    'name email avatarUrl'
  );
  if (!doctor) throw ApiError.notFound('Doctor profile not found');
  res.json({ doctor });
});

exports.updateMyDoctorProfile = asyncHandler(async (req, res) => {
  const allowed = [
    'specialization',
    'degree',
    'yearsOfExperience',
    'hospital',
    'city',
    'bio',
    'consultationFee',
    'languages',
    'availableDays',
    'availableSlots',
  ];
  const updates = {};
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });
  if (req.body.documents) updates.documents = req.body.documents;

  const doctor = await Doctor.findOneAndUpdate({ user: req.user.id }, updates, {
    new: true,
  });
  if (!doctor) throw ApiError.notFound();
  res.json({ doctor });
});

exports.specialties = asyncHandler(async (req, res) => {
  const list = await Doctor.distinct('specialization', {
    verificationStatus: 'verified',
  });
  res.json({ specialties: list.sort() });
});
