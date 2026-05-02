const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    specialization: { type: String, required: true, index: true },
    degree: { type: String, required: true },
    licenseNumber: { type: String, required: true, unique: true },
    yearsOfExperience: { type: Number, default: 0 },
    hospital: { type: String },
    city: { type: String, index: true },
    bio: { type: String, maxlength: 1500 },
    consultationFee: { type: Number, default: 0 },
    languages: [{ type: String }],
    documents: {
      govtIdUrl: { type: String },
      certificateUrl: { type: String },
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    availableNow: { type: Boolean, default: false, index: true },
    availableDays: [
      { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    ],
    availableSlots: [
      {
        day: { type: String },
        from: { type: String },
        to: { type: String },
      },
    ],
  },
  { timestamps: true }
);

doctorSchema.index({ specialization: 1, verificationStatus: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
