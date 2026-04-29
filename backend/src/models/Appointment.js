const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm
    reason: { type: String, maxlength: 500 },
    mode: { type: String, enum: ['video', 'chat', 'in-person'], default: 'video' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    aiReport: { type: mongoose.Schema.Types.ObjectId, ref: 'AIReport' },
    notes: { type: String },
    videoRoom: { type: String },
  },
  { timestamps: true }
);

appointmentSchema.index({ doctor: 1, date: 1, time: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
