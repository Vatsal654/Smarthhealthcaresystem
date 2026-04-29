/**
 * Hybrid symptom engine.
 *
 * Strategy:
 *   1. Normalize free-text input → tokens.
 *   2. Map tokens to a canonical symptom vocabulary built from the diseases collection.
 *   3. Score every disease by overlap of matched symptoms vs disease symptoms,
 *      weighted by symptom rarity (TF-IDF style) so common symptoms count less.
 *   4. Boost / penalize using user follow-up answers (severity, duration, red flags).
 *   5. Return ranked candidates, an overall risk band, and the top match.
 */

const Disease = require('../models/Disease');

const SYNONYMS = {
  fever: ['fever', 'high temperature', 'pyrexia', 'feverish'],
  cough: ['cough', 'coughing'],
  'sore throat': ['sore throat', 'throat pain', 'painful throat', 'scratchy throat'],
  headache: ['headache', 'head pain', 'migraine'],
  vomiting: ['vomiting', 'throwing up', 'puking', 'vomit'],
  nausea: ['nausea', 'queasy', 'sick to stomach'],
  diarrhea: ['diarrhea', 'loose motion', 'loose stool'],
  fatigue: ['fatigue', 'tired', 'weakness', 'exhausted', 'lethargy'],
  'chest pain': ['chest pain', 'pain in chest', 'tight chest'],
  'shortness of breath': [
    'shortness of breath',
    'breathlessness',
    'difficulty breathing',
    'breathing problem',
    'cannot breathe',
  ],
  'body ache': ['body ache', 'body pain', 'muscle ache', 'myalgia'],
  rash: ['rash', 'skin rash', 'red spots'],
  itching: ['itching', 'itchy', 'pruritus'],
  'runny nose': ['runny nose', 'rhinorrhea', 'nasal discharge'],
  'stomach pain': ['stomach pain', 'abdominal pain', 'belly pain', 'tummy pain'],
  dizziness: ['dizziness', 'lightheaded', 'vertigo'],
  chills: ['chills', 'shivering', 'shivers'],
  sneezing: ['sneezing', 'sneeze'],
  congestion: ['congestion', 'blocked nose', 'stuffy nose'],
  'joint pain': ['joint pain', 'arthralgia'],
  'loss of taste': ['loss of taste', 'no taste', 'taste loss'],
  'loss of smell': ['loss of smell', 'no smell', 'anosmia'],
};

const RED_FLAGS = [
  'chest pain',
  'shortness of breath',
  'severe bleeding',
  'unconscious',
  'fainting',
  'blue lips',
  'seizure',
  'stiff neck',
  'severe headache',
  'paralysis',
  'slurred speech',
];

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s,.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSymptoms(rawText) {
  const text = normalize(rawText);
  if (!text) return [];

  const found = new Set();

  for (const [canonical, variants] of Object.entries(SYNONYMS)) {
    for (const v of variants) {
      if (text.includes(v)) {
        found.add(canonical);
        break;
      }
    }
  }

  // also accept comma or "and" separated tokens like "fever, cough, headache"
  const parts = text
    .split(/,| and |;|\.|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const p of parts) {
    for (const [canonical, variants] of Object.entries(SYNONYMS)) {
      if (variants.some((v) => v === p)) found.add(canonical);
    }
  }

  return Array.from(found);
}

async function buildIdf(diseases) {
  const N = diseases.length || 1;
  const df = new Map();
  for (const d of diseases) {
    for (const s of d.symptoms || []) {
      df.set(s, (df.get(s) || 0) + 1);
    }
  }
  const idf = new Map();
  for (const [s, c] of df.entries()) {
    idf.set(s, Math.log((N + 1) / (c + 1)) + 1);
  }
  return idf;
}

function scoreDisease(disease, userSymptoms, idf) {
  const dSymptoms = (disease.symptoms || []).map((s) => s.toLowerCase());
  if (!dSymptoms.length) return null;

  const setUser = new Set(userSymptoms);

  let matchedWeight = 0;
  let totalWeight = 0;
  const matched = [];
  const missed = [];

  for (const s of dSymptoms) {
    const w = idf.get(s) || 1;
    totalWeight += w;
    if (setUser.has(s)) {
      matchedWeight += w;
      matched.push(s);
    } else {
      missed.push(s);
    }
  }

  if (matched.length === 0) return null;

  // confidence = weighted overlap, with small bonus when most user symptoms
  // line up with this disease (precision)
  const recall = totalWeight ? matchedWeight / totalWeight : 0;
  const precision = userSymptoms.length
    ? matched.length / userSymptoms.length
    : 0;
  const confidence = Math.min(99, Math.round((recall * 0.7 + precision * 0.3) * 100));

  return {
    diseaseId: disease._id,
    name: disease.name,
    category: disease.category,
    confidence,
    riskLevel: disease.riskLevel,
    matchedSymptoms: matched,
    missedSymptoms: missed.slice(0, 6),
    specialist: disease.specialist,
    severity: disease.severity,
    description: disease.description,
    homeRemedies: disease.homeRemedies,
    medicines: disease.medicines,
    redFlags: disease.redFlags,
  };
}

function applyAnswers(scored, answers = {}) {
  if (!answers) return scored;

  return scored.map((m) => {
    let conf = m.confidence;

    if (answers.duration === 'gt_7_days' && m.severity === 'mild') conf -= 8;
    if (answers.duration === 'lt_24h' && m.severity === 'severe') conf -= 5;
    if (answers.severity === 'severe') {
      if (m.severity === 'severe') conf += 6;
      else if (m.severity === 'mild') conf -= 4;
    }
    if (answers.feverTemp && Number(answers.feverTemp) >= 102 && m.symptoms?.includes?.('fever')) {
      conf += 4;
    }
    if (answers.pregnancy === true && /pregnan/i.test(m.name || '')) conf += 5;

    return { ...m, confidence: Math.max(1, Math.min(99, Math.round(conf))) };
  });
}

function deriveRisk(matches, userSymptoms) {
  const flagged = userSymptoms.some((s) => RED_FLAGS.includes(s));
  const top = matches[0];
  if (flagged) return 'red';
  if (!top) return 'green';
  if (top.confidence >= 80 && top.severity === 'severe') return 'red';
  if (top.confidence >= 30) return 'yellow';
  return 'green';
}

function followUpQuestions(userSymptoms, matches) {
  const questions = [];

  if (userSymptoms.length < 3) {
    questions.push({
      key: 'extraSymptoms',
      type: 'text',
      label: 'Anything else you are noticing? (e.g. chills, body ache, rash)',
    });
  }

  questions.push({
    key: 'duration',
    type: 'choice',
    label: 'How long have you had these symptoms?',
    options: [
      { value: 'lt_24h', label: 'Less than 24 hours' },
      { value: '1_3_days', label: '1–3 days' },
      { value: '4_7_days', label: '4–7 days' },
      { value: 'gt_7_days', label: 'More than a week' },
    ],
  });

  questions.push({
    key: 'severity',
    type: 'choice',
    label: 'How severe is it overall?',
    options: [
      { value: 'mild', label: 'Mild — manageable' },
      { value: 'moderate', label: 'Moderate — uncomfortable' },
      { value: 'severe', label: 'Severe — interferes with daily life' },
    ],
  });

  if (userSymptoms.includes('fever')) {
    questions.push({
      key: 'feverTemp',
      type: 'number',
      label: 'Highest temperature recorded (°F)? Skip if unsure.',
    });
  }

  if (matches.some((m) => /pregn|menstr/i.test(m.category || ''))) {
    questions.push({
      key: 'pregnancy',
      type: 'boolean',
      label: 'Are you pregnant or could you be?',
    });
  }

  return questions.slice(0, 4);
}

async function analyze({ text = '', extraSymptoms = [], answers = {} }) {
  const fromText = extractSymptoms(text);
  const fromExtra = extraSymptoms.flatMap((t) => extractSymptoms(t));
  const userSymptoms = Array.from(new Set([...fromText, ...fromExtra]));

  if (!userSymptoms.length) {
    return {
      extractedSymptoms: [],
      matches: [],
      topMatch: null,
      overallRisk: 'green',
      followUps: [
        {
          key: 'symptoms',
          type: 'text',
          label:
            'Could you describe your symptoms in a sentence? e.g. "fever and cough since 2 days".',
        },
      ],
      advice:
        'Tell me what you are feeling — start with one or two symptoms and we will go from there.',
    };
  }

  const diseases = await Disease.find().lean();
  const idf = await buildIdf(diseases);

  const scored = diseases
    .map((d) => scoreDisease(d, userSymptoms, idf))
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence);

  const adjusted = applyAnswers(scored, answers).sort(
    (a, b) => b.confidence - a.confidence
  );

  const top5 = adjusted.slice(0, 5);
  const overallRisk = deriveRisk(top5, userSymptoms);
  const followUps = followUpQuestions(userSymptoms, top5);

  return {
    extractedSymptoms: userSymptoms,
    matches: top5,
    topMatch: top5[0] || null,
    overallRisk,
    followUps,
  };
}

module.exports = {
  analyze,
  extractSymptoms,
  RED_FLAGS,
};
