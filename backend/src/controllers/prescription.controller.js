const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  const { appointmentId, medicines = [], instructions = '', diagnosis = '', signatureDataUrl } = req.body;
  if (!appointmentId) throw ApiError.badRequest('appointmentId required');

  const doctor = await Doctor.findOne({ user: req.user.id });
  if (!doctor) throw ApiError.forbidden('Only doctors can issue prescriptions');

  const appt = await Appointment.findById(appointmentId);
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (String(appt.doctor) !== String(doctor._id)) {
    throw ApiError.forbidden('You can only prescribe for your own appointments');
  }

  const presc = await Prescription.create({
    appointment: appt._id,
    doctor: doctor._id,
    patient: appt.patient,
    medicines,
    instructions,
    diagnosis,
    signatureDataUrl,
  });

  await Notification.create({
    user: appt.patient,
    type: 'system',
    title: 'New prescription received',
    body: `Dr. ${req.user.name} has issued a prescription.`,
    link: `/appointments`,
  });

  // Notify in real time
  const io = req.app.get('io');
  if (io) io.to(`user:${appt.patient}`).emit('prescription:new', { prescriptionId: presc._id });

  res.status(201).json({ prescription: presc });
});

exports.byAppointment = asyncHandler(async (req, res) => {
  const list = await Prescription.find({ appointment: req.params.appointmentId })
    .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ prescriptions: list });
});

exports.mine = asyncHandler(async (req, res) => {
  let filter;
  if (req.user.role === 'doctor') {
    const d = await Doctor.findOne({ user: req.user.id });
    filter = { doctor: d?._id };
  } else {
    filter = { patient: req.user.id };
  }
  const list = await Prescription.find(filter)
    .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
    .populate('patient', 'name email')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ prescriptions: list });
});

exports.get = asyncHandler(async (req, res) => {
  const p = await Prescription.findById(req.params.id)
    .populate({ path: 'doctor', populate: { path: 'user', select: 'name' } })
    .populate('patient', 'name email')
    .lean();
  if (!p) throw ApiError.notFound();
  // access: patient, prescribing doctor, or admin
  const isPatient = String(p.patient?._id || p.patient) === req.user.id;
  const docRecord = await Doctor.findOne({ user: req.user.id });
  const isDoctor = docRecord && String(p.doctor?._id || p.doctor) === String(docRecord._id);
  if (!isPatient && !isDoctor && req.user.role !== 'admin') throw ApiError.forbidden();
  res.json({ prescription: p });
});
