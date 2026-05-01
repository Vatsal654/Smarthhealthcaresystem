const crypto = require('crypto');
const AIReport = require('../models/AIReport');
const Disease = require('../models/Disease');
const Doctor = require('../models/Doctor');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const symptomEngine = require('../services/symptomEngine');
const gemini = require('../services/gemini.service');

/**
 * Step 1: extract symptoms and return follow-up questions WITHOUT
 * running the full disease match. The frontend collects all answers
 * and then calls /api/ai/finalize.
 */
exports.preliminary = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) throw ApiError.badRequest('Tell me what you are feeling.');

  const result = await symptomEngine.analyze({ text, extraSymptoms: [], answers: {} });

  if (!result.extractedSymptoms.length) {
    return res.json({
      sessionId: crypto.randomBytes(8).toString('hex'),
      extractedSymptoms: [],
      followUps: result.followUps,
      message:
        'I could not pick out specific symptoms yet. Could you describe what you feel — for example "fever and cough since 2 days"?',
    });
  }

  res.json({
    sessionId: crypto.randomBytes(8).toString('hex'),
    extractedSymptoms: result.extractedSymptoms,
    followUps: result.followUps,
    message: `Got it — ${result.extractedSymptoms.join(', ')}. Just a few quick questions before I give you a report.`,
  });
});

/**
 * Step 2: full analysis. Takes original text + all collected answers,
 * runs disease matching + Gemini-generated branded advice.
 */
exports.finalize = asyncHandler(async (req, res) => {
  const { text, answers = {}, sessionId } = req.body;
  if (!text || !text.trim()) throw ApiError.badRequest('Missing original symptom text.');

  const extras = Object.entries(answers)
    .filter(([k, v]) => k === 'extraSymptoms' && typeof v === 'string')
    .map(([, v]) => v);

  const result = await symptomEngine.analyze({ text, extraSymptoms: extras, answers });

  // Normalize raw match scores to a probability distribution so the
  // top conditions visibly sum to 100% — never three things at "50% each".
  const normalizedMatches = normalizeConfidences(result.matches);
  const topMatch = normalizedMatches[0] || null;

  // Pick suggested doctors (specialty + verified) for the top match.
  let suggestedDoctors = [];
  if (topMatch?.specialist) {
    suggestedDoctors = await Doctor.find({
      verificationStatus: 'verified',
      specialization: new RegExp(topMatch.specialist, 'i'),
    })
      .populate('user', 'name email avatarUrl')
      .sort({ rating: -1 })
      .limit(4)
      .lean();
  }

  const advice = await gemini.generateAdvice({
    extractedSymptoms: result.extractedSymptoms,
    matches: normalizedMatches,
    overallRisk: result.overallRisk,
    answers,
  });

  const aiProvider = process.env.GEMINI_API_KEY ? 'gemini-1.5-flash' : 'rule-engine-fallback';

  const payload = {
    sessionId: sessionId || crypto.randomBytes(8).toString('hex'),
    inputSymptoms: [text],
    extractedSymptoms: result.extractedSymptoms,
    answers,
    matches: normalizedMatches,
    topMatch,
    overallRisk: result.overallRisk,
    advice: typeof advice === 'string' ? advice : '',
    summary: advice?.message || '',
  };

  let report = null;
  if (req.user) {
    report = await AIReport.create({ ...payload, user: req.user.id });
  }

  res.json({
    sessionId: payload.sessionId,
    extractedSymptoms: payload.extractedSymptoms,
    matches: normalizedMatches,
    topMatch,
    overallRisk: payload.overallRisk,
    advice,
    suggestedDoctors,
    aiProvider,
    disclaimer: advice.disclaimer,
    reportId: report?._id || null,
  });
});

/**
 * Convert raw match scores (which can all be e.g. 50%) into a
 * probability distribution that sums to 100% across the top matches.
 * This makes the rankings legible to a non-technical user.
 */
function normalizeConfidences(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return [];
  const top = matches.slice(0, 5);

  // Squash so the strongest signal dominates more than a flat normalization
  const weights = top.map((m) => Math.pow(Math.max(1, m.confidence), 1.4));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;

  const scaled = top.map((m, i) => ({
    ...m,
    rawConfidence: m.confidence,
    confidence: Math.round((weights[i] / sum) * 100),
  }));

  // Patch rounding so total = 100
  const total = scaled.reduce((a, b) => a + b.confidence, 0);
  if (scaled.length && total !== 100) {
    scaled[0].confidence += 100 - total;
  }
  return scaled;
}

/**
 * Legacy endpoint kept for backward compatibility — runs full pipeline
 * in one shot (used by the dashboard quick-check).
 */
exports.analyze = asyncHandler(async (req, res) => {
  req.body.finalize = true;
  return exports.finalize(req, res);
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
  if (
    String(report.user) !== req.user.id &&
    req.user.role !== 'doctor' &&
    req.user.role !== 'admin'
  ) {
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
