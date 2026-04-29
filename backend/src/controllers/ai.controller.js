const crypto = require('crypto');
const AIReport = require('../models/AIReport');
const Disease = require('../models/Disease');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const symptomEngine = require('../services/symptomEngine');
const gemini = require('../services/gemini.service');

exports.analyze = asyncHandler(async (req, res) => {
  const { text, extraSymptoms = [], answers = {}, sessionId } = req.body;

  const result = await symptomEngine.analyze({ text, extraSymptoms, answers });

  const summary = await gemini.summarize({
    extractedSymptoms: result.extractedSymptoms,
    matches: result.matches,
    overallRisk: result.overallRisk,
    answers,
  });

  const adviceByRisk = {
    green: 'Looks mild. Try home care and rest. Watch for worsening symptoms.',
    yellow:
      'Symptoms warrant attention. Consider booking a doctor consultation in the next 24–48 hours.',
    red: 'Urgent: please connect with a doctor immediately or seek emergency care.',
  };

  const payload = {
    sessionId: sessionId || crypto.randomBytes(8).toString('hex'),
    inputSymptoms: text ? [text] : [],
    extractedSymptoms: result.extractedSymptoms,
    answers,
    matches: result.matches,
    topMatch: result.topMatch,
    overallRisk: result.overallRisk,
    advice: adviceByRisk[result.overallRisk],
    summary,
  };

  let report = null;
  if (req.user) {
    report = await AIReport.create({ ...payload, user: req.user.id });
  }

  res.json({
    sessionId: payload.sessionId,
    extractedSymptoms: payload.extractedSymptoms,
    matches: payload.matches,
    topMatch: payload.topMatch,
    overallRisk: payload.overallRisk,
    followUps: result.followUps,
    advice: payload.advice,
    summary: payload.summary,
    disclaimer:
      'This tool provides indicative guidance only and is not a medical diagnosis.',
    reportId: report?._id || null,
  });
});

exports.listReports = asyncHandler(async (req, res) => {
  const reports = await AIReport.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ reports });
});

exports.getReport = asyncHandler(async (req, res) => {
  const report = await AIReport.findById(req.params.id).lean();
  if (!report) throw ApiError.notFound();
  if (String(report.user) !== req.user.id && req.user.role !== 'doctor' && req.user.role !== 'admin') {
    throw ApiError.forbidden();
  }
  res.json({ report });
});

exports.diseases = asyncHandler(async (req, res) => {
  const { q, category, limit = 50 } = req.query;
  const filter = {};
  if (q) filter.name = new RegExp(q, 'i');
  if (category) filter.category = category;
  const list = await Disease.find(filter).limit(Number(limit)).lean();
  res.json({ diseases: list });
});
