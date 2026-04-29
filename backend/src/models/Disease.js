const mongoose = require('mongoose');

const diseaseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    category: { type: String, index: true },
    symptoms: [{ type: String, lowercase: true, trim: true, index: true }],
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'moderate',
    },
    riskLevel: { type: String, enum: ['green', 'yellow', 'red'], default: 'yellow' },
    homeRemedies: [{ type: String }],
    medicines: [{ type: String }],
    specialist: { type: String },
    description: { type: String },
    redFlags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Disease', diseaseSchema);
