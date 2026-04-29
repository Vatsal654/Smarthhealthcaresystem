const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => {
  const { doctorId, date, time, reason, mode = 'video', aiReportId } = req.body;
  if (!doctorId || !date || !time) throw ApiError.badRequest('doctorId, date, time required');

  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw ApiError.notFound('Doctor not found');

  const room = `appt_${crypto.randomBytes(6).toString('hex')}`;

  const appt = await Appointment.create({
    patient: req.user.id,
    doctor: doctorId,
    date,
    time,
    reason,
    mode,
    aiReport: aiReportId,
    videoRoom: room,
  });

  await Notification.create({
    user: doctor.user,
    type: 'appointment',
    title: 'New appointment request',
    body: `Patient booked you for ${date} at ${time}`,
    link: `/doctor/appointments/${appt._id}`,
  });

  res.status(201).json({ appointment: appt });
});

exports.listMine = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter =
    req.user.role === 'doctor'
      ? { doctor: (await Doctor.findOne({ user: req.user.id }))?._id }
      : { patient: req.user.id };

  if (status) filter.status = status;

  const list = await Appointment.find(filter)
    .populate({ path: 'doctor', populate: { path: 'user', select: 'name email avatarUrl' } })
    .populate('patient', 'name email avatarUrl')
    .sort({ date: -1, time: -1 })
    .lean();

  res.json({ appointments: list });
});

exports.get = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.params.id)
    .populate({ path: 'doctor', populate: { path: 'user', select: 'name email avatarUrl' } })
    .populate('patient', 'name email avatarUrl')
    .populate('aiReport');
  if (!appt) throw ApiError.notFound();

  const isPatient = String(appt.patient?._id || appt.patient) === req.user.id;
  const doctorRecord = await Doctor.findOne({ user: req.user.id });
  const isDoctor =
    req.user.role === 'doctor' && doctorRecord && String(appt.doctor?._id || appt.doctor) === String(doctorRecord._id);

  if (!isPatient && !isDoctor && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  res.json({ appointment: appt });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }
  const appt = await Appointment.findById(req.params.id);
  if (!appt) throw ApiError.notFound();

  const doctorRecord = await Doctor.findOne({ user: req.user.id });
  const isDoctor = doctorRecord && String(appt.doctor) === String(doctorRecord._id);
  const isPatient = String(appt.patient) === req.user.id;

  if (!isDoctor && !isPatient && req.user.role !== 'admin') throw ApiError.forbidden();

  appt.status = status;
  await appt.save();

  const targetUser = isDoctor ? appt.patient : doctorRecord?.user;
  if (targetUser) {
    await Notification.create({
      user: targetUser,
      type: 'appointment',
      title: `Appointment ${status}`,
      body: `Your appointment on ${appt.date} ${appt.time} is now ${status}`,
    });
  }

  res.json({ appointment: appt });
});
