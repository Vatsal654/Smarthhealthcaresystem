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
    generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
  });
  return model;
}

const SAFETY_PREAMBLE = `You are a careful medical assistant inside the Smart Healthcare System.
You NEVER diagnose. You only summarize the engine's structured output in warm,
plain language. Always include a short disclaimer that this is not a medical
diagnosis. If risk is "red", recommend immediate doctor or emergency care.`;

async function summarize({ extractedSymptoms, matches, overallRisk, answers }) {
  const m = getModel();
  if (!m) {
    return fallbackSummary({ extractedSymptoms, matches, overallRisk });
  }

  const top = matches.slice(0, 3);
  const prompt = `${SAFETY_PREAMBLE}

User reported symptoms: ${extractedSymptoms.join(', ') || 'none'}
Follow-up answers: ${JSON.stringify(answers || {})}
Engine top matches:
${top
  .map(
    (m, i) =>
      `${i + 1}. ${m.name} (${m.confidence}% match, ${m.riskLevel} risk, specialist: ${
        m.specialist || 'general'
      })`
  )
  .join('\n')}

Overall risk band: ${overallRisk}.

Write a short response (max 6 short sentences) that:
- acknowledges the symptoms
- mentions the most likely conditions cautiously ("this may be associated with...")
- gives 2-3 home care suggestions if risk is green/yellow
- if risk is red, urges urgent medical attention first
- ends with: "This is not a medical diagnosis. Please consult a clinician."`;

  try {
    const r = await m.generateContent(prompt);
    return r.response.text().trim();
  } catch (err) {
    logger.warn('Gemini summarize failed, using fallback:', err.message);
    return fallbackSummary({ extractedSymptoms, matches, overallRisk });
  }
}

function fallbackSummary({ extractedSymptoms, matches, overallRisk }) {
  const top = matches[0];
  const list = extractedSymptoms.length ? extractedSymptoms.join(', ') : 'your symptoms';

  if (overallRisk === 'red') {
    return `Based on ${list}, your symptoms could indicate something serious. Please seek urgent medical care or start a video consult now. This is not a medical diagnosis. Please consult a clinician.`;
  }

  if (!top) {
    return `I could not match your symptoms to a known pattern. If you keep feeling unwell, please consult a doctor. This is not a medical diagnosis.`;
  }

  return `Based on ${list}, this may be associated with ${top.name} (${top.confidence}% match). Stay hydrated, rest, and monitor your symptoms. If things worsen, book a consultation. This is not a medical diagnosis. Please consult a clinician.`;
}

module.exports = { summarize, fallbackSummary };
