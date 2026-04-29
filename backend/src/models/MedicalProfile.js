const mongoose = require('mongoose');

const medicalProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    age: { type: Number, min: 0, max: 130 },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
    },
    heightCm: { type: Number },
    weightKg: { type: Number },
    allergies: [{ type: String }],
    chronicConditions: [{ type: String }],
    currentMedications: [{ type: String }],
    pastSurgeries: [{ type: String }],
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicalProfile', medicalProfileSchema);
