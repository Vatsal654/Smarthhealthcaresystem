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

exports.myDashboard = asyncHandler(async (req, res) => {
  const Appointment = require('../models/Appointment');
  const doctor = await Doctor.findOne({ user: req.user.id });
  if (!doctor) throw ApiError.notFound('Doctor profile not found');

  const today = new Date().toISOString().slice(0, 10);

  const [todayAppts, pending, recent, totalCompleted] = await Promise.all([
    Appointment.find({ doctor: doctor._id, date: today })
      .populate('patient', 'name email avatarUrl')
      .sort({ time: 1 })
      .lean(),
    Appointment.find({ doctor: doctor._id, status: 'pending' })
      .populate('patient', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Appointment.find({ doctor: doctor._id })
      .populate('patient', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    Appointment.countDocuments({ doctor: doctor._id, status: 'completed' }),
  ]);

  // unique patients ever seen
  const patientIds = new Set(recent.map((a) => String(a.patient?._id || a.patient)));

  res.json({
    doctor,
    stats: {
      todayCount: todayAppts.length,
      pendingCount: pending.length,
      completedCount: totalCompleted,
      uniquePatients: patientIds.size,
    },
    todayAppointments: todayAppts,
    pendingAppointments: pending,
    recentAppointments: recent,
  });
});

exports.myPatients = asyncHandler(async (req, res) => {
  const Appointment = require('../models/Appointment');
  const doctor = await Doctor.findOne({ user: req.user.id });
  if (!doctor) throw ApiError.notFound('Doctor profile not found');

  const appts = await Appointment.find({ doctor: doctor._id })
    .populate('patient', 'name email avatarUrl phone')
    .sort({ createdAt: -1 })
    .lean();

  const map = new Map();
  for (const a of appts) {
    const id = String(a.patient?._id);
    if (!id) continue;
    if (!map.has(id)) {
      map.set(id, {
        patient: a.patient,
        appointmentsCount: 0,
        lastAppointment: a,
      });
    }
    map.get(id).appointmentsCount += 1;
  }

  res.json({ patients: Array.from(map.values()) });
});

exports.myDoctors = asyncHandler(async (req, res) => {
  const Appointment = require('../models/Appointment');
  const appts = await Appointment.find({ patient: req.user.id })
    .populate({
      path: 'doctor',
      populate: { path: 'user', select: 'name email avatarUrl' },
    })
    .sort({ createdAt: -1 })
    .lean();

  const map = new Map();
  for (const a of appts) {
    const id = String(a.doctor?._id);
    if (!id) continue;
    if (!map.has(id)) {
      map.set(id, {
        doctor: a.doctor,
        appointmentsCount: 0,
        lastAppointment: a,
      });
    }
    map.get(id).appointmentsCount += 1;
  }

  res.json({ doctors: Array.from(map.values()) });
});
