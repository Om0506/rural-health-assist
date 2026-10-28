import {
  getGroqClient,
  getGroqModel,
  markModelInvalid,
  isModelInvalid,
  GROQ_CHAT_MODEL,
  GROQ_FALLBACK_MODELS,
} from './groqClient.js';
import { generateGroqFallbackReply } from './groqChatService.js';

const RECENT_MESSAGE_LIMIT = 6;

export const HEALTH_TRIAGE_SYSTEM_PROMPT = `You are an AI-assisted rural healthcare triage assistant.

Your role:
- understand symptoms conversationally (including informal language)
- analyze symptom progression and deterioration
- detect urgency and functional impairment
- estimate contextual healthcare risk dynamically (scores must evolve across the conversation)
- recommend appropriate escalation routing

You are NOT a doctor.
Do NOT provide final diagnosis.
Do NOT aggressively prescribe medicines.

Focus on: progression, worsening conditions, dehydration, breathing/chest concerns, functional impact.

Escalation routes (use exactly one):
- SELF_CARE — mild, stable symptoms
- ASHA_REVIEW — moderate concern, needs community health worker follow-up
- DOCTOR_ESCALATION — high urgency, severe or rapidly worsening symptoms

Risk levels: LOW, MODERATE, HIGH
Trends: stable, worsening, deteriorating, improving

Functional impairment examples: unable to sleep, eat, walk, sit; too weak to function.

You will receive:
1) structured healthMemory from prior turns
2) only the last few recent messages (not full history)
3) the latest user message

You MUST respond with valid JSON only (no markdown), using this exact schema:
{
  "assistantResponse": "natural conversational reply to the patient",
  "severityDelta": 0,
  "trend": "stable",
  "progressionDetected": false,
  "urgencyLevel": "low",
  "functionalImpairment": false,
  "currentSymptoms": [],
  "symptomCategories": [],
  "severityIndicators": [],
  "progressionIndicators": [],
  "functionalImpairments": [],
  "duration": null,
  "durationLabel": null,
  "escalationSuggestion": "SELF_CARE",
  "summary": "one-line clinical summary for health workers"
}

Rules:
- Do NOT output any absolute riskScore. Only output severityDelta: a small signed integer indicating how much risk should increase or decrease from the PRIOR score.
- Small new or improving symptoms → small deltas (e.g. -10 to +10).
- Moderate worsening (pain increasing, repeated nausea/vomiting, poor sleep) → moderate deltas (e.g. +10 to +20).
- Major red flags (chest pain, breathing difficulty, repeated vomiting with weakness, inability to walk/eat) → larger deltas (e.g. +25 to +40).
- If symptoms clearly improve (\"pain stopped\", \"feeling better\", \"vomiting stopped\") → negative delta to slowly reduce risk.
- urgencyLevel must be one of: low, moderate, high.
- escalationSuggestion must be one of: SELF_CARE, ASHA_REVIEW, DOCTOR_ESCALATION.
- assistantResponse must NOT include "Severity:" or "Risk Level:" lines (UI shows those separately).
- keep assistantResponse concise (2-4 short paragraphs max)`;

const pickRecentMessages = (priorMessages = []) => {
  const filtered = priorMessages
    .filter((m) => m.message && String(m.message).trim())
    .map((m) => ({
      role: m.sender_type === 'user' ? 'user' : 'assistant',
      content: String(m.message).trim(),
    }));
  return filtered.slice(-RECENT_MESSAGE_LIMIT);
};

const parseJsonResponse = (text) => {
  const raw = String(text || '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
};

const defaultAnalysis = () => ({
  assistantResponse: '',
  severityDelta: 0,
  trend: 'stable',
  progressionDetected: false,
  urgencyLevel: 'low',
  functionalImpairment: false,
  currentSymptoms: [],
  symptomCategories: [],
  severityIndicators: [],
  progressionIndicators: [],
  functionalImpairments: [],
  duration: null,
  durationLabel: null,
  escalationSuggestion: 'SELF_CARE',
  summary: '',
});

export const analyzeHealthTurn = async ({
  healthMemory,
  priorMessages = [],
  userMessage,
  language = 'English',
  patientHistoryContext = '',
}) => {
  const groq = getGroqClient();
  const recentConversation = pickRecentMessages(priorMessages);

  const langNote =
    language === 'Hindi'
      ? 'Write assistantResponse in Hindi unless the user wrote in English.'
      : language === 'Marathi'
        ? 'Write assistantResponse in Marathi unless the user wrote in English.'
        : 'Write assistantResponse in English unless the user wrote Hindi or Marathi.';

  const payload = {
    language,
    healthMemory,
    recentConversation,
    latestUserMessage: String(userMessage).trim(),
    patientHistoryContext: patientHistoryContext?.slice(0, 1500) || '',
  };

  const candidateModels = [
    getGroqModel(),
    process.env.GROQ_MODEL,
    GROQ_CHAT_MODEL,
    ...GROQ_FALLBACK_MODELS,
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx && !isModelInvalid(m));

  if (candidateModels.length === 0) {
    console.error('[Groq Triage] No valid models available.');
    throw new Error('No valid Groq models available');
  }

  let completion = null;
  let usedModel = null;
  let lastError = null;

  for (const model of candidateModels) {
    try {
      completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: `${HEALTH_TRIAGE_SYSTEM_PROMPT}\n\n${langNote}` },
          {
            role: 'user',
            content: `Analyze and respond with JSON only:\n${JSON.stringify(payload)}`,
          },
        ],
        temperature: 0.35,
        max_tokens: 1100,
        response_format: { type: 'json_object' },
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
        `[Groq Triage API Error] Model "${model}" failed (status: ${err?.status || 'unknown'}): ${
          err?.message || err
        }`
      );

      if (isNotFoundOrInvalid) {
        console.warn(
          `[Groq Triage] Model "${model}" is invalid or inaccessible. Skipping to avoid repeated retries.`
        );
        markModelInvalid(model);
      } else {
        throw err;
      }
    }
  }

  if (!completion) {
    throw lastError || new Error('Groq triage failed for all candidate models');
  }

  const content = completion.choices?.[0]?.message?.content?.trim();
  const parsed = parseJsonResponse(content) || defaultAnalysis();

  if (!parsed.assistantResponse) {
    parsed.assistantResponse = generateGroqFallbackReply(language);
  }

  return {
    analysis: parsed,
    model: usedModel || candidateModels[0],
  };
};

export const buildFallbackAnalysis = (language, partial = {}) => ({
  ...defaultAnalysis(),
  assistantResponse: generateGroqFallbackReply(language),
  ...partial,
});
