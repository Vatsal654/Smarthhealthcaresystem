const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

let jsonModel = null;
let textModel = null;

function getJsonModel() {
  if (jsonModel) return jsonModel;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  jsonModel = new GoogleGenerativeAI(key).getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.5, maxOutputTokens: 1100, responseMimeType: 'application/json' },
  });
  return jsonModel;
}

function getTextModel() {
  if (textModel) return textModel;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  textModel = new GoogleGenerativeAI(key).getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.6, maxOutputTokens: 700 },
  });
  return textModel;
}

/* ------------------------------------------------------------------ */
/* Per-turn decision: chat / ask / finalize                            */
/* ------------------------------------------------------------------ */

const TRIAGE_RULES = `You are SHS, a careful conversational triage assistant.

Inputs each turn:
- the conversation so far (between "patient" and "you")
- the SHS engine's currently extracted symptoms and ranked candidate diseases

Three possible decisions per turn:
1. "chat"   — the user is making small-talk or asking a non-medical
              question. Reply warmly in 1-3 sentences. No medical advice.
2. "ask"    — you need more clinical detail. Ask ONE highly targeted
              question that best discriminates between the top candidate
              diseases or rules out red flags (chest pain, breathing
              issues, severe bleeding, neuro signs).
3. "finalize" — you can now produce a final triage report.

Aim to converge on ONE most-likely condition. Keep asking until the top
candidate is clearly ahead (>= 30 percentage points lead over second).
Stop and finalize immediately if a red-flag symptom is reported, the user
explicitly says they are done, or you have already asked 8 questions.

You may use a "think" field to record private reasoning.

Strict JSON output:
{
  "decision": "chat" | "ask" | "finalize",
  "reply": "string (only for chat)",
  "question": "string (only for ask)",
  "think": "1 short sentence — private reasoning",
  "redFlag": true | false
}`;

async function nextStep({ conversation = [], extractedSymptoms = [], candidates = [], turnsAsked = 0 }) {
  const m = getJsonModel();
  if (!m) {
    return heuristicNextStep({ extractedSymptoms, candidates, turnsAsked });
  }

  const dialogue = conversation
    .map((c) => `${c.role === 'user' ? 'patient' : 'you'}: ${c.content}`)
    .join('\n');

  const prompt = `${TRIAGE_RULES}

Conversation so far:
${dialogue || '(none yet)'}

Engine state:
- extracted symptoms: ${extractedSymptoms.join(', ') || '(none)'}
- candidate diseases (normalized %):
${candidates
  .slice(0, 5)
  .map(
    (c, i) =>
      `  ${i + 1}. ${c.name} — ${c.confidence}% (${c.riskLevel} risk, specialist: ${
        c.specialist || 'general'
      })`
  )
  .join('\n')}
- bot questions asked so far: ${turnsAsked}

Output strict JSON now.`;

  try {
    const r = await m.generateContent(prompt);
    const parsed = JSON.parse(r.response.text());
    return {
      decision: ['chat', 'ask', 'finalize'].includes(parsed.decision) ? parsed.decision : 'ask',
      reply: String(parsed.reply || '').slice(0, 600),
      question: String(parsed.question || '').slice(0, 400),
      think: String(parsed.think || ''),
      redFlag: !!parsed.redFlag,
    };
  } catch (err) {
    logger.warn('Gemini nextStep failed, using heuristic:', err.message);
    return heuristicNextStep({ extractedSymptoms, candidates, turnsAsked });
  }
}

function heuristicNextStep({ extractedSymptoms, candidates, turnsAsked }) {
  const top = candidates[0];
  const second = candidates[1];

  if (turnsAsked >= 8) return { decision: 'finalize', question: '', reply: '', think: 'Question cap', redFlag: false };
  if (top && top.confidence >= 70 && (!second || second.confidence < 40)) {
    return { decision: 'finalize', question: '', reply: '', think: 'High-confidence match', redFlag: false };
  }
  if (extractedSymptoms.length === 0) {
    return {
      decision: 'ask',
      question: "Could you tell me more about what's bothering you — where you feel it and how long?",
      reply: '',
      think: 'No symptoms extracted',
      redFlag: false,
    };
  }
  const generic = [
    'How long have you had these symptoms?',
    'Any fever? If yes, how high?',
    'Any chest pain or breathing difficulty?',
    'Any vomiting, diarrhea, or stomach pain?',
    'Any rash or skin changes?',
    'Do you have chronic conditions or allergies?',
    'Have you taken any medication for this so far?',
    'On a scale of 1-10, how severe is it?',
  ];
  return {
    decision: 'ask',
    question: generic[Math.min(turnsAsked, generic.length - 1)],
    reply: '',
    think: 'Heuristic',
    redFlag: false,
  };
}

/* ------------------------------------------------------------------ */
/* Symptom extraction via Gemini                                       */
/* ------------------------------------------------------------------ */

const EXTRACT_RULES = `You read patient messages and return a JSON array of
canonical symptom keywords (lower-case, hyphenless), e.g.
["fever","cough","shortness of breath","headache"].
Only include symptoms ACTUALLY mentioned. If none, return [].`;

async function extractSymptoms(text) {
  const m = getJsonModel();
  if (!m || !text) return [];
  try {
    const r = await m.generateContent(`${EXTRACT_RULES}\n\nPatient text:\n${text}\n\nReturn JSON: { "symptoms": [...] }`);
    const parsed = JSON.parse(r.response.text());
    if (!Array.isArray(parsed.symptoms)) return [];
    return parsed.symptoms.map((s) => String(s).toLowerCase().trim()).filter(Boolean);
  } catch (err) {
    logger.warn('Gemini extractSymptoms failed:', err.message);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Final structured advice                                             */
/* ------------------------------------------------------------------ */

const ADVICE_RULES = `You are SHS's medical assistant. You NEVER diagnose. You phrase things
as "may be associated with". Take the engine output and produce a warm,
specific, plain-language report in STRICT JSON.

Aim to focus on the single most likely condition. Mention secondary
candidates only if they are within 15% of the top.

For each remedy, write a real 1-2 sentence description (HOW to do it).
For each medicine, list dosage and 2-3 common side effects.

By risk band:
- "green": 4-6 home remedies; medicines=[]; urgentActions=[]; warningSigns=[]; doctorAdvice="".
- "yellow": 3-5 home remedies AND 2-3 OTC medicines; urgentActions=[]; warningSigns=[]; doctorAdvice = "Book a doctor if symptoms persist 48h or worsen".
- "red": remedies=[]; medicines=[]; urgentActions=4-6 specific actions; warningSigns=4-6 escalation signs; doctorAdvice="Connect with a doctor immediately or visit an emergency room".

Always include 'primaryCondition' (string, the single most-likely name) and
a 2-sentence empathetic 'message' that names primaryCondition explicitly.
Always include 'disclaimer': "This is not a medical diagnosis. Please consult a licensed clinician for confirmation."`;

const ADVICE_SCHEMA = `Strict JSON shape:
{
  "primaryCondition": "string",
  "message": "string",
  "remedies": [{ "title": "string", "description": "string" }],
  "medicines": [{ "name": "string", "dosage": "string", "purpose": "string", "sideEffects": "string" }],
  "urgentActions": [{ "title": "string", "description": "string" }],
  "warningSigns": ["string"],
  "doctorAdvice": "string",
  "disclaimer": "string"
}`;

async function generateAdvice({ extractedSymptoms, matches, overallRisk, answers }) {
  const m = getJsonModel();
  if (!m) return fallbackAdvice({ extractedSymptoms, matches, overallRisk });

  const top = matches.slice(0, 3);
  const prompt = `${ADVICE_RULES}

User symptoms: ${extractedSymptoms.join(', ') || 'none'}
Conversation context: ${JSON.stringify(answers || {}).slice(0, 1500)}
Engine top matches:
${top
  .map(
    (mm, i) =>
      `${i + 1}. ${mm.name} — ${mm.confidence}% (${mm.riskLevel} risk, specialist: ${mm.specialist || 'general'})`
  )
  .join('\n')}
Overall risk band: ${overallRisk}

${ADVICE_SCHEMA}`;

  try {
    const r = await m.generateContent(prompt);
    const parsed = JSON.parse(r.response.text().trim());
    return normalizeAdvice(parsed, overallRisk, top[0]?.name);
  } catch (err) {
    logger.warn('Gemini advice failed, fallback:', err.message);
    return fallbackAdvice({ extractedSymptoms, matches, overallRisk });
  }
}

function normalizeAdvice(adv, risk, fallbackName) {
  const safe = {
    primaryCondition: String(adv.primaryCondition || fallbackName || 'a common condition'),
    message: String(adv.message || '').slice(0, 600),
    remedies: Array.isArray(adv.remedies) ? adv.remedies.slice(0, 6) : [],
    medicines: Array.isArray(adv.medicines) ? adv.medicines.slice(0, 4) : [],
    urgentActions: Array.isArray(adv.urgentActions) ? adv.urgentActions.slice(0, 6) : [],
    warningSigns: Array.isArray(adv.warningSigns) ? adv.warningSigns.slice(0, 6) : [],
    doctorAdvice: String(adv.doctorAdvice || ''),
    disclaimer:
      adv.disclaimer ||
      'This is not a medical diagnosis. Please consult a licensed clinician for confirmation.',
  };
  if (risk === 'green') { safe.medicines = []; safe.urgentActions = []; safe.warningSigns = []; }
  else if (risk === 'yellow') { safe.urgentActions = []; }
  else if (risk === 'red') { safe.remedies = []; safe.medicines = []; }
  return safe;
}

function fallbackAdvice({ extractedSymptoms, matches, overallRisk }) {
  const top = matches[0];
  const list = extractedSymptoms.join(', ') || 'your symptoms';
  const name = top?.name || 'a common condition';
  if (overallRisk === 'red') {
    return {
      primaryCondition: name,
      message: `Based on ${list}, your situation may need urgent medical attention.`,
      remedies: [], medicines: [],
      urgentActions: [
        { title: 'Connect with a doctor immediately', description: 'Use the Doctors tab or call your local emergency number.' },
        { title: 'Do not self-medicate', description: 'Avoid taking new medications until evaluated.' },
      ],
      warningSigns: top?.redFlags?.length ? top.redFlags : ['chest pain', 'severe difficulty breathing', 'fainting', 'severe bleeding'],
      doctorAdvice: 'Connect with a doctor immediately or visit an emergency room.',
      disclaimer: 'This is not a medical diagnosis. Please consult a licensed clinician for confirmation.',
    };
  }
  if (overallRisk === 'yellow') {
    return {
      primaryCondition: name,
      message: `Based on ${list}, this may be associated with ${name}. Try basic care and monitor for 24-48 hours.`,
      remedies: top?.homeRemedies?.slice(0, 4).map((r) => ({ title: r, description: '' })) || [],
      medicines: (top?.medicines || []).slice(0, 3).map((mn) => ({
        name: mn,
        dosage: 'As per pharmacist or package',
        purpose: 'Symptomatic relief',
        sideEffects: 'Consult pharmacist if you have allergies or pregnancy.',
      })),
      urgentActions: [], warningSigns: [],
      doctorAdvice: 'Book a doctor if symptoms persist beyond 48 hours or worsen.',
      disclaimer: 'This is not a medical diagnosis. Please consult a licensed clinician for confirmation.',
    };
  }
  return {
    primaryCondition: name,
    message: `Based on ${list}, this looks mild. Some basic home care should help.`,
    remedies: top?.homeRemedies?.slice(0, 5).map((r) => ({ title: r, description: '' })) || [
      { title: 'Hydration', description: 'Drink plenty of fluids.' },
      { title: 'Rest', description: 'Get adequate sleep.' },
    ],
    medicines: [], urgentActions: [], warningSigns: [],
    doctorAdvice: '',
    disclaimer: 'This is not a medical diagnosis. Please consult a licensed clinician for confirmation.',
  };
}

/* ------------------------------------------------------------------ */
/* Free-form follow-up answer (after the report)                      */
/* ------------------------------------------------------------------ */

const FOLLOWUP_RULES = `You are SHS's medical assistant. The user has just received a triage
report and is asking a follow-up question (e.g. "give me the home care
in more detail", "can I take ibuprofen?", "what should I eat?").
Answer warmly in plain language, 4-8 sentences max. Stay specific and
practical. If anything looks like a red flag (chest pain, breathing
trouble, severe bleeding, neuro signs) — urge immediate medical care.
Always end with: "Reminder: this is general guidance, not a diagnosis."`;

async function freeFollowUp({ report, question }) {
  const m = getTextModel();
  if (!m) {
    return `Based on your report, here are some general suggestions. ${
      report?.advice?.message || ''
    }\n\nReminder: this is general guidance, not a diagnosis.`;
  }
  const prompt = `${FOLLOWUP_RULES}

Report context:
- Primary condition: ${report?.advice?.primaryCondition || report?.topMatch?.name || 'unknown'}
- Risk: ${report?.overallRisk}
- Symptoms: ${(report?.extractedSymptoms || []).join(', ')}
- Top matches: ${(report?.matches || []).slice(0, 3).map((m) => `${m.name} (${m.confidence}%)`).join(', ')}

User asks: "${question}"`;

  try {
    const r = await m.generateContent(prompt);
    return r.response.text().trim();
  } catch (err) {
    logger.warn('Gemini freeFollowUp failed:', err.message);
    return 'Sorry, I could not generate more detail right now. Please try again in a moment. Reminder: this is general guidance, not a diagnosis.';
  }
}

module.exports = {
  nextStep,
  generateAdvice,
  fallbackAdvice,
  extractSymptoms,
  freeFollowUp,
};
