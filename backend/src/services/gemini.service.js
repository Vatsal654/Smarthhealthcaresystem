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
    generationConfig: { temperature: 0.4, maxOutputTokens: 900, responseMimeType: 'application/json' },
  });
  return model;
}

const SYSTEM_RULES = `You are a careful medical assistant inside Smart Healthcare System (SHS).
You NEVER give a diagnosis. You phrase suggestions as "may be associated with".
Your job is to take the engine's structured output and produce a short, warm,
plain-language response with home remedies and/or medicines depending on the
risk band, in STRICT JSON.

Rules by risk band:
- "green" (mild): suggest 4-6 home remedies. NO medicines. NO doctor CTA.
- "yellow" (moderate): suggest 3-5 home remedies AND 2-3 over-the-counter
  medicines, each with common side effects. Recommend booking a doctor
  if symptoms persist beyond 48 hours.
- "red" (urgent): NO home remedies, NO medicines. Recommend immediate
  doctor consultation or emergency care, list red-flag warning signs.

Always include a short empathetic 'message' (max 2 sentences).
Always include a 'disclaimer' field exactly:
  "This is not a medical diagnosis. Please consult a licensed clinician for confirmation."`;

const SCHEMA_HINT = `Return ONLY valid JSON with this exact shape:
{
  "message": "string (2 sentences max)",
  "remedies": [{ "title": "string", "description": "string (1-2 sentences)" }],
  "medicines": [{ "name": "string", "dosage": "string", "purpose": "string", "sideEffects": "string (comma separated)" }],
  "urgentActions": [{ "title": "string", "description": "string" }],
  "warningSigns": ["string"],
  "doctorAdvice": "string or empty",
  "disclaimer": "string"
}
- For green risk: include remedies; medicines=[]; urgentActions=[]; warningSigns=[].
- For yellow risk: include remedies and medicines; urgentActions=[].
- For red risk: include urgentActions and warningSigns; remedies=[]; medicines=[].
`;

async function generateAdvice({ extractedSymptoms, matches, overallRisk, answers }) {
  const m = getModel();
  if (!m) return fallbackAdvice({ extractedSymptoms, matches, overallRisk });

  const top = matches.slice(0, 3);
  const prompt = `${SYSTEM_RULES}

User symptoms: ${extractedSymptoms.join(', ') || 'none'}
Follow-up answers: ${JSON.stringify(answers || {})}
Engine top matches:
${top
  .map(
    (mm, i) =>
      `${i + 1}. ${mm.name} — ${mm.confidence}% match, ${mm.riskLevel} risk (specialist: ${
        mm.specialist || 'general'
      })`
  )
  .join('\n')}
Overall risk band: ${overallRisk}

${SCHEMA_HINT}`;

  try {
    const r = await m.generateContent(prompt);
    const text = r.response.text().trim();
    const parsed = JSON.parse(text);
    return normalizeAdvice(parsed, overallRisk);
  } catch (err) {
    logger.warn('Gemini structured advice failed, falling back:', err.message);
    return fallbackAdvice({ extractedSymptoms, matches, overallRisk });
  }
}

function normalizeAdvice(adv, risk) {
  const safe = {
    message: String(adv.message || '').slice(0, 400),
    remedies: Array.isArray(adv.remedies) ? adv.remedies.slice(0, 6) : [],
    medicines: Array.isArray(adv.medicines) ? adv.medicines.slice(0, 4) : [],
    urgentActions: Array.isArray(adv.urgentActions) ? adv.urgentActions.slice(0, 5) : [],
    warningSigns: Array.isArray(adv.warningSigns) ? adv.warningSigns.slice(0, 6) : [],
    doctorAdvice: String(adv.doctorAdvice || ''),
    disclaimer:
      adv.disclaimer ||
      'This is not a medical diagnosis. Please consult a licensed clinician for confirmation.',
  };
  // enforce risk-band rules
  if (risk === 'green') {
    safe.medicines = [];
    safe.urgentActions = [];
    safe.warningSigns = [];
  } else if (risk === 'yellow') {
    safe.urgentActions = [];
  } else if (risk === 'red') {
    safe.remedies = [];
    safe.medicines = [];
  }
  return safe;
}

function fallbackAdvice({ extractedSymptoms, matches, overallRisk }) {
  const top = matches[0];
  const list = extractedSymptoms.join(', ') || 'your symptoms';

  if (overallRisk === 'red') {
    return {
      message: `Based on ${list}, your situation may need urgent medical attention.`,
      remedies: [],
      medicines: [],
      urgentActions: [
        { title: 'Connect with a doctor immediately', description: 'Use the Doctors tab or call your local emergency number.' },
        { title: 'Do not self-medicate', description: 'Avoid taking new medications until evaluated by a clinician.' },
      ],
      warningSigns: top?.redFlags?.length
        ? top.redFlags
        : ['chest pain', 'severe difficulty breathing', 'fainting', 'severe bleeding'],
      doctorAdvice: 'Seek a video consultation now.',
      disclaimer: 'This is not a medical diagnosis. Please consult a licensed clinician for confirmation.',
    };
  }

  if (overallRisk === 'yellow') {
    return {
      message: `Based on ${list}, this may be associated with ${top?.name || 'a common condition'}. Try basic care and monitor for 24–48 hours.`,
      remedies:
        top?.homeRemedies?.slice(0, 4).map((r) => ({ title: r, description: '' })) || [
          { title: 'Hydration', description: 'Drink water and electrolytes regularly.' },
          { title: 'Rest', description: 'Sleep well and avoid strenuous activity.' },
        ],
      medicines: (top?.medicines || []).slice(0, 3).map((m) => ({
        name: m,
        dosage: 'As per package or pharmacist advice',
        purpose: 'Symptomatic relief',
        sideEffects: 'Consult pharmacist if you have allergies, pregnancy, or chronic conditions.',
      })),
      urgentActions: [],
      warningSigns: [],
      doctorAdvice: 'If symptoms persist beyond 48 hours or worsen, book a consultation.',
      disclaimer: 'This is not a medical diagnosis. Please consult a licensed clinician for confirmation.',
    };
  }

  return {
    message: `Based on ${list}, this looks mild. Some basic home care should help.`,
    remedies:
      top?.homeRemedies?.slice(0, 5).map((r) => ({ title: r, description: '' })) || [
        { title: 'Hydration', description: 'Drink plenty of fluids.' },
        { title: 'Rest', description: 'Get adequate sleep.' },
        { title: 'Light diet', description: 'Eat easy-to-digest food.' },
      ],
    medicines: [],
    urgentActions: [],
    warningSigns: [],
    doctorAdvice: '',
    disclaimer: 'This is not a medical diagnosis. Please consult a licensed clinician for confirmation.',
  };
}

module.exports = { generateAdvice, fallbackAdvice };
