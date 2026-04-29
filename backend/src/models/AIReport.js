const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    diseaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Disease' },
    name: String,
    category: String,
    confidence: Number,
    riskLevel: { type: String, enum: ['green', 'yellow', 'red'] },
    matchedSymptoms: [String],
    missedSymptoms: [String],
    specialist: String,
  },
  { _id: false }
);

const aiReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: { type: String, index: true },
    inputSymptoms: [{ type: String }],
    extractedSymptoms: [{ type: String }],
    answers: { type: Object, default: {} },
    matches: [matchSchema],
    topMatch: matchSchema,
    overallRisk: { type: String, enum: ['green', 'yellow', 'red'], default: 'green' },
    advice: { type: String },
    summary: { type: String },
    disclaimer: {
      type: String,
      default:
        'This tool provides indicative guidance only and is not a medical diagnosis. Always consult a licensed clinician for medical concerns.',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIReport', aiReportSchema);
