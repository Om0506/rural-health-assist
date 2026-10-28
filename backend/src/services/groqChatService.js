import {
  getGroqClient,
  getGroqModel,
  markModelInvalid,
  isModelInvalid,
  GROQ_CHAT_MODEL,
  GROQ_FALLBACK_MODELS,
} from './groqClient.js';
import { getStructuredSymptomSnapshot } from './symptomAccumulatorService.js';

const BASE_SYSTEM_PROMPT = `You are an AI-assisted rural healthcare support assistant.

Your role:
- understand symptoms conversationally
- ask intelligent follow-up questions naturally
- provide healthcare guidance
- provide hydration, rest, and monitoring suggestions
- offer general care guidance (rest, hydration, monitoring)
- do NOT decide or announce doctor/ASHA escalation — the backend triage system handles that separately

You are NOT a doctor.
Do NOT provide final diagnosis.
Do NOT prescribe medicines aggressively.

Avoid repetitive robotic responses.
Avoid rigid scripted questioning like a form.
Respond naturally and conversationally like a supportive healthcare assistant.

Do NOT output raw severity labels like "Severity: HIGH" in your reply — the system adds risk level separately.
Keep responses concise (2-4 short paragraphs max unless the user asks for detail).`;

const buildSystemPrompt = ({
  language = 'English',
  patientHistoryContext = '',
  symptomSnapshot = null,
}) => {
  const langNote =
    language === 'Hindi'
      ? 'Respond in Hindi unless the user writes in English.'
      : language === 'Marathi'
      ? 'Respond in Marathi unless the user writes in English.'
      : 'Respond in English unless the user writes in Hindi or Marathi.';

  let prompt = `${BASE_SYSTEM_PROMPT}\n\n${langNote}`;

  if (symptomSnapshot && (symptomSnapshot.symptoms?.length || symptomSnapshot.duration)) {
    prompt += `\n\nKnown symptom context from this session (use for continuity, do not restart assessment from scratch):
${JSON.stringify(symptomSnapshot, null, 2)}`;
  }

  if (patientHistoryContext?.trim()) {
    prompt += `\n\nRelevant patient history:\n${patientHistoryContext}`;
  }

  return prompt;
};

export const buildGroqMessages = ({
  priorMessages = [],
  language,
  patientHistoryContext,
  symptomSnapshot,
}) => {
  const system = buildSystemPrompt({ language, patientHistoryContext, symptomSnapshot });
  const history = priorMessages
    .filter((m) => m.message && String(m.message).trim())
    .map((m) => ({
      role: m.sender_type === 'user' ? 'user' : 'assistant',
      content: String(m.message).trim(),
    }));

  return [{ role: 'system', content: system }, ...history];
};

/**
 * Generate conversational reply using full session history.
 */
export const generateGroqHealthReply = async ({
  priorMessages = [],
  language = 'English',
  patientHistoryContext = '',
  symptomSnapshot = null,
}) => {
  const groq = getGroqClient();
  const messages = buildGroqMessages({
    priorMessages,
    language,
    patientHistoryContext,
    symptomSnapshot: symptomSnapshot || getStructuredSymptomSnapshot({}),
  });

  const candidateModels = [
    getGroqModel(),
    process.env.GROQ_MODEL,
    GROQ_CHAT_MODEL,
    ...GROQ_FALLBACK_MODELS,
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx && !isModelInvalid(m));

  if (candidateModels.length === 0) {
    console.error('[Groq Chat] No valid models available.');
    throw new Error('No valid Groq models available');
  }

  let completion = null;
  let usedModel = null;
  let lastError = null;

  for (const model of candidateModels) {
    try {
      completion = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.65,
        max_tokens: 900,
      });
      usedModel = model;
      break;
    } catch (err) {
      lastError = err;
      const isNotFoundOrInvalid =
        err?.status === 404 ||
        err?.status === 400 ||
        /does not exist|not found|do not have access/i.test(err?.message || '');

      console.error(
        `[Groq Chat API Error] Model "${model}" failed (status: ${err?.status || 'unknown'}): ${
          err?.message || err
        }`
      );

      if (isNotFoundOrInvalid) {
        console.warn(
          `[Groq Chat] Model "${model}" is invalid or inaccessible. Skipping to avoid repeated retries.`
        );
        markModelInvalid(model);
      } else {
        throw err;
      }
    }
  }

  if (!completion) {
    throw lastError || new Error('Groq chat completion failed for all candidate models');
  }

  const reply = completion.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error('Empty response from Groq');
  }

  return {
    reply: stripEmbeddedSeverity(reply),
    model: usedModel || candidateModels[0],
  };
};

function stripEmbeddedSeverity(text) {
  return String(text)
    .replace(/\n?\s*Severity\s*(Level)?\s*:\s*\w+/gi, '')
    .replace(/\n?\s*Risk\s*Level\s*:\s*\w+/gi, '')
    .trim();
}

export const generateGroqFallbackReply = (language = 'English') => {
  const messages = {
    English:
      'I am having trouble connecting right now. Please try again in a moment, or contact your ASHA worker if symptoms are urgent.',
    Hindi:
      'अभी कनेक्ट नहीं हो पा रहा। कृपया थोड़ी देर बाद पुनः प्रयास करें, या तुरंत ASHA से संपर्क करें।',
    Marathi:
      'सध्या कनेक्ट होऊ शकत नाही. थोड्या वेळाने पुन्हा प्रयत्न करा, किंवा तातडीने आशा सेविकेशी संपर्क करा.',
  };
  return messages[language] || messages.English;
};
