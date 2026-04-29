const { AccessToken } = require('livekit-server-sdk');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.getToken = asyncHandler(async (req, res) => {
  const { appointmentId, room: roomOverride } = req.body;

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    throw ApiError.internal('LiveKit credentials not configured');
  }

  let room = roomOverride;

  if (appointmentId) {
    const appt = await Appointment.findById(appointmentId);
    if (!appt) throw ApiError.notFound('Appointment not found');

    const doctor = await Doctor.findOne({ user: req.user.id });
    const isPatient = String(appt.patient) === req.user.id;
    const isDoctor = doctor && String(appt.doctor) === String(doctor._id);

    if (!isPatient && !isDoctor) throw ApiError.forbidden();
    if (appt.status !== 'confirmed' && appt.status !== 'completed') {
      throw ApiError.badRequest('Appointment must be confirmed to start video');
    }

    room = appt.videoRoom || `appt_${appt._id}`;
  }

  if (!room) throw ApiError.badRequest('appointmentId or room required');

  const at = new AccessToken(apiKey, apiSecret, {
    identity: req.user.id,
    name: req.user.name,
    ttl: 60 * 60,
  });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  res.json({ token, url: wsUrl, room });
});
