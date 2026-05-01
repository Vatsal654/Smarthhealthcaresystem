const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

let model = null;
function getModel() {
  if (model) return model;
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const genAI = new GoogleGenerativeAI(key);
  model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 900,
      responseMimeType: 'application/json',
    },
  });
  return model;
}

const TRIAGE_RULES = `You are a careful, conversational triage assistant inside Smart
Healthcare System (SHS). You speak warmly and like a real clinician interview.

You will receive:
- the conversation so far
- a list of candidate diseases the SHS engine has matched against the
  user's described symptoms, with weighted likelihoods
- a list of canonical symptoms already extracted from the user's words

Your job each turn is to DECIDE:
  (a) keep interviewing — ask ONE highly targeted follow-up question that
      will discriminate between the top candidate diseases or escalate
      red-flag symptoms (e.g., chest pain, breathing issues, severe
      bleeding, neurological signs).
  (b) finalize — produce the final triage report.

Rules for asking:
- Only ask ONE question per turn.
- The question must be specific and likely to narrow the differential
  (e.g., "Do you also have any sore throat or runny nose?" beats "Tell me more").
- Avoid yes/no when an open question would help; avoid open questions
  when yes/no is faster.
- Stop asking and finalize when ANY of these is true:
   * The top candidate's normalized likelihood is >= 70 and the next is < 40.
   * You have asked 4 questions already.
   * The user reports any red-flag symptom.
   * The user explicitly says they're done answering.

Strict JSON output:
{
  "decision": "ask" | "finalize",
  "question": "string (only when decision=ask)",
  "reasoning": "1 sentence — why this question or why finalize",
  "redFlag": true | false
}`;

async function nextStep({ conversation = [], extractedSymptoms = [], candidates = [], turnsAsked = 0 }) {
  const m = getModel();
  if (!m) {
    return heuristicNextStep({ extractedSymptoms, candidates, turnsAsked });
  }

  const dialogue = conversation
    .map((c) => `${c.role === 'user' ? 'patient' : 'assistant'}: ${c.content}`)
    .join('\n');

  const prompt = `${TRIAGE_RULES}

Conversation so far:
${dialogue || '(none yet)'}

Engine state:
- extracted symptoms: ${extractedSymptoms.join(', ') || '(none)'}
- candidate diseases (top, with normalized likelihood %):
${candidates
  .slice(0, 5)
  .map(
    (c, i) =>
      `  ${i + 1}. ${c.name} — ${c.confidence}% (${c.riskLevel} risk, specialist: ${
        c.specialist || 'general'
      })`
  )
  .join('\n')}
- questions you have already asked: ${turnsAsked}

Output strict JSON now.`;

  try {
    const r = await m.generateContent(prompt);
    const parsed = JSON.parse(r.response.text());
    return {
      decision: parsed.decision === 'finalize' ? 'finalize' : 'ask',
      question: String(parsed.question || '').slice(0, 400),
      reasoning: String(parsed.reasoning || ''),
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

  // Finalize conditions
  if (turnsAsked >= 4) return { decision: 'finalize', question: '', reasoning: 'Reached question limit', redFlag: false };
  if (top && top.confidence >= 70 && (!second || second.confidence < 40)) {
    return { decision: 'finalize', question: '', reasoning: 'High-confidence top match', redFlag: false };
  }
  if (extractedSymptoms.length === 0) {
    return {
      decision: 'ask',
      question: "Could you tell me more about what's bothering you? For example, where do you feel it and for how long?",
      reasoning: 'No symptoms extracted yet',
      redFlag: false,
    };
  }

  // Ask a discriminating question
  const generic = [
    'How long have you had these symptoms — hours, days, or weeks?',
    'Have you had any fever? If yes, how high?',
    'Are you experiencing any chest pain or breathing difficulty?',
    'Any vomiting, diarrhea, or stomach pain?',
    'Have you noticed any rash or skin changes?',
    'Do you have any chronic conditions (diabetes, asthma, etc) or allergies?',
  ];
  const idx = Math.min(turnsAsked, generic.length - 1);
  return {
    decision: 'ask',
    question: generic[idx],
    reasoning: 'Heuristic discriminator',
    redFlag: false,
  };
}

const ADVICE_RULES = `You are SHS's medical assistant. You NEVER diagnose. You phrase things
as "may be associated with". Take the engine output and produce a warm,
specific, plain-language report in STRICT JSON.

For each remedy, write a real 1-2 sentence description (HOW to do it).
For each medicine, list dosage and 2-3 common side effects.

By risk band:
- "green": 4-6 home remedies; medicines=[]; urgentActions=[]; warningSigns=[]; doctorAdvice="".
- "yellow": 3-5 home remedies AND 2-3 OTC medicines; urgentActions=[]; warningSigns=[]; doctorAdvice = "Book a doctor if symptoms persist 48h or worsen".
- "red": remedies=[]; medicines=[]; urgentActions=4-6 specific actions; warningSigns=4-6 escalation signs; doctorAdvice="Connect with a doctor immediately or visit an emergency room".

Always include a 2-sentence empathetic 'message'.
Always include 'disclaimer': "This is not a medical diagnosis. Please consult a licensed clinician for confirmation."`;

const ADVICE_SCHEMA = `Strict JSON shape:
{
  "message": "string",
  "remedies": [{ "title": "string", "description": "string" }],
  "medicines": [{ "name": "string", "dosage": "string", "purpose": "string", "sideEffects": "string" }],
  "urgentActions": [{ "title": "string", "description": "string" }],
  "warningSigns": ["string"],
  "doctorAdvice": "string",
  "disclaimer": "string"
}`;

async function generateAdvice({ extractedSymptoms, matches, overallRisk, answers }) {
  const m = getModel();
  if (!m) return fallbackAdvice({ extractedSymptoms, matches, overallRisk });

  const top = matches.slice(0, 3);
  const prompt = `${ADVICE_RULES}

User symptoms: ${extractedSymptoms.join(', ') || 'none'}
Conversation answers: ${JSON.stringify(answers || {})}
Engine top matches:
${top
  .map(
    (mm, i) =>
      `${i + 1}. ${mm.name} — ${mm.confidence}% (${mm.riskLevel} risk, specialist: ${
        mm.specialist || 'general'
      })`
  )
  .join('\n')}
Overall risk band: ${overallRisk}

${ADVICE_SCHEMA}`;

  try {
    const r = await m.generateContent(prompt);
    const parsed = JSON.parse(r.response.text().trim());
    return normalizeAdvice(parsed, overallRisk);
  } catch (err) {
    logger.warn('Gemini advice failed, fallback:', err.message);
    return fallbackAdvice({ extractedSymptoms, matches, overallRisk });
  }
}

function normalizeAdvice(adv, risk) {
  const safe = {
    message: String(adv.message || '').slice(0, 500),
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

  if (overallRisk === 'red') {
    return {
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
      message: `Based on ${list}, this may be associated with ${top?.name || 'a common condition'}. Try basic care and monitor for 24–48 hours.`,
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

module.exports = { nextStep, generateAdvice, fallbackAdvice };
