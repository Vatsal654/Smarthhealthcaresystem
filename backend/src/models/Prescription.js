const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    medicines: [
      {
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
        notes: String,
      },
    ],
    instructions: { type: String },
    fileUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
