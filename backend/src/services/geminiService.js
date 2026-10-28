import { GoogleGenAI } from '@google/genai';

const SUPPORTED_LANGUAGES = {
  English: 'Respond in English using simple rural-friendly language.',
  Hindi: 'Respond in Hindi using simple rural-friendly language.',
  Marathi: 'Respond in Marathi using simple village-friendly language.'
};

let aiClient;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const MODEL_FALLBACKS = ['gemini-1.5-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash'];

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
};

const memory = new Map();

const getConversationContext = (userId) => {
  if (!memory.has(userId)) {
    memory.set(userId, []);
  }
  return memory.get(userId);
};

const parseSymptoms = (text = '') => {
  const knownSymptoms = [
    'fever',
    'cough',
    'headache',
    'body pain',
    'vomiting',
    'breathing difficulty',
    'breathing problem',
    'chest pain',
    'sore throat',
    'fatigue'
  ];
  const normalized = text.toLowerCase();
  return knownSymptoms.filter((symptom) => normalized.includes(symptom));
};

const listSymptomsInLanguage = (language, symptoms = []) => {
  if (!symptoms.length) return '';
  const labels = {
    English: {
      fever: 'fever',
      cough: 'cough',
      headache: 'headache',
      vomiting: 'vomiting',
      diarrhea: 'diarrhea',
      'body pain': 'body pain',
      fatigue: 'fatigue',
      'chest pain': 'chest pain',
      'breathing problem': 'breathing problem',
      dehydration: 'dehydration'
    },
    Hindi: {
      fever: 'बुखार',
      cough: 'खांसी',
      headache: 'सिरदर्द',
      vomiting: 'उल्टी',
      diarrhea: 'दस्त',
      'body pain': 'शरीर दर्द',
      fatigue: 'कमजोरी',
      'chest pain': 'सीने में दर्द',
      'breathing problem': 'सांस लेने में समस्या',
      dehydration: 'डिहाइड्रेशन'
    },
    Marathi: {
      fever: 'ताप',
      cough: 'खोकला',
      headache: 'डोकेदुखी',
      vomiting: 'उलटी',
      diarrhea: 'जुलाब',
      'body pain': 'अंगदुखी',
      fatigue: 'थकवा',
      'chest pain': 'छातीत दुखणे',
      'breathing problem': 'श्वास घेण्यास त्रास',
      dehydration: 'डिहायड्रेशन'
    }
  };
  const map = labels[language] || labels.English;
  return symptoms.map((s) => map[s] || s).join(', ');
};

export const buildRuleBasedFallbackReply = ({
  message = '',
  language = 'English',
  detectedSymptoms = [],
  newlyDetectedSymptoms = [],
  priorPrescriptions = [],
  conversationState = 'COLLECTING_SYMPTOMS',
  medicineIntent = false
}) => {
  const text = String(message).toLowerCase();
  const allSymptoms = `${text} ${detectedSymptoms.join(' ').toLowerCase()}`;
  const hasFever = allSymptoms.includes('fever');
  const hasCough = allSymptoms.includes('cough');
  const hasHeadache = allSymptoms.includes('headache');
  const hasBreathingIssue = allSymptoms.includes('breathing');
  const hasChestPain = allSymptoms.includes('chest pain');
  const hasVomiting = allSymptoms.includes('vomiting');
  const hasDehydration = allSymptoms.includes('dehydration');
  const hasDiarrhea = allSymptoms.includes('diarrhea');
  const hasBodyPain = allSymptoms.includes('body pain');
  const symptomCount = detectedSymptoms.length;
  const symptomListText = listSymptomsInLanguage(language, detectedSymptoms);
  const newlyAdded = listSymptomsInLanguage(language, newlyDetectedSymptoms);
  const prescriptionHint =
    priorPrescriptions.length > 0
      ? priorPrescriptions
          .slice(0, 2)
          .map((item) => item.medicine_name)
          .join(', ')
      : '';

  const followUpQuestion = {
    English: 'Since when are you feeling this problem?',
    Hindi: 'यह समस्या कब से हो रही है?',
    Marathi: 'ही समस्या तुम्हाला कधीपासून आहे?'
  };

  if (medicineIntent && (hasChestPain || hasBreathingIssue)) {
    if (language === 'Hindi') return 'सीने या सांस की गंभीर समस्या में खुद से दवा न लें। तुरंत ASHA कार्यकर्ता या अस्पताल से संपर्क करें।';
    if (language === 'Marathi') return 'छाती किंवा श्वासाच्या गंभीर त्रासात स्वतःहून औषध घेऊ नका. तात्काळ आशा सेविका किंवा रुग्णालयाशी संपर्क करा.';
    return 'For chest or breathing emergency, do not self-medicate. Contact ASHA worker or nearest hospital immediately.';
  }

  if (medicineIntent && symptomCount > 0) {
    const medSuggestion =
      prescriptionHint || (hasFever || hasBodyPain ? 'Paracetamol' : hasDiarrhea || hasDehydration ? 'ORS' : hasCough ? 'simple cough syrup' : 'basic OTC medicine');
    if (language === 'Hindi') return `आपके लक्षण (${symptomListText}) में ${medSuggestion} मदद कर सकता है, लेकिन पहले ASHA/डॉक्टर से पुष्टि करें। दवा हमेशा मार्गदर्शन में लें।`;
    if (language === 'Marathi') return `तुमच्या लक्षणांसाठी (${symptomListText}) ${medSuggestion} उपयोगी ठरू शकते, पण आधी आशा सेविका/डॉक्टरांची खात्री करा. औषध नेहमी मार्गदर्शनाने घ्या.`;
    return `For your symptoms (${symptomListText}), ${medSuggestion} may help, but confirm with ASHA/doctor first. Take medicines only with doctor/ASHA guidance.`;
  }

  if (language === 'Hindi') {
    if (hasChestPain || hasBreathingIssue) {
      return 'यह गंभीर स्थिति हो सकती है। कृपया तुरंत ASHA कार्यकर्ता या नजदीकी अस्पताल से संपर्क करें।';
    }
    if (newlyDetectedSymptoms.length > 0 && symptomCount >= 2) {
      return `मैंने नए लक्षण नोट किए: ${newlyAdded}. ${symptomListText} के लिए आराम करें और ORS/पानी लें${prescriptionHint ? `; पहले डॉक्टर द्वारा दी गई दवा (${prescriptionHint}) केवल पुष्टि के बाद लें` : '; जरूरत होने पर सामान्य OTC दवा ASHA/डॉक्टर से पूछकर लें'}। दवा हमेशा डॉक्टर/ASHA के मार्गदर्शन में लें।`;
    }
    if (symptomCount === 1) {
      return followUpQuestion.Hindi;
    }
    if (hasDiarrhea) {
      return 'दस्त में ORS लेते रहें, साफ पानी पिएं, और तला-भुना भोजन टालें। कमजोरी बढ़े तो तुरंत ASHA कार्यकर्ता से संपर्क करें।';
    }
    if (symptomCount >= 2) {
      return `आपके लक्षण (${symptomListText}) के अनुसार आराम करें और पानी/ORS लेते रहें${prescriptionHint ? `; पहले दी गई दवा (${prescriptionHint}) डॉक्टर/ASHA से पुष्टि के बाद लें` : '; सामान्य OTC विकल्प ASHA/डॉक्टर से पूछकर लें'}। दवा हमेशा डॉक्टर/ASHA के मार्गदर्शन में लें।`;
    }
    if (hasVomiting || hasDehydration) {
      return 'उल्टी या डिहाइड्रेशन में ORS और पानी लेते रहें। यदि कमजोरी बढ़े या बार-बार उल्टी हो तो तुरंत ASHA कार्यकर्ता से संपर्क करें।';
    }
    if (hasFever && hasCough) {
      return 'बुखार और खांसी के लिए आराम करें, पर्याप्त पानी पिएं, और तापमान मॉनिटर करें। अगर 2-3 दिन में सुधार न हो तो ASHA कार्यकर्ता से मिलें।';
    }
    if (hasHeadache) {
      return 'सिरदर्द के लिए आराम करें, पानी पिएं, और तेज रोशनी से बचें। यदि दर्द बढ़े तो स्वास्थ्य कार्यकर्ता से संपर्क करें।';
    }
    return 'कृपया अपने लक्षण विस्तार से बताएं। मैं आपकी मदद के लिए यहां हूं।';
  }

  if (language === 'Marathi') {
    if (hasChestPain || hasBreathingIssue) {
      return 'ही गंभीर स्थिती असू शकते. कृपया तात्काळ आशा सेविका किंवा जवळच्या रुग्णालयाशी संपर्क करा.';
    }
    if (newlyDetectedSymptoms.length > 0 && symptomCount >= 2) {
      return `मी नवे लक्षण नोंदवले: ${newlyAdded}. ${symptomListText} साठी विश्रांती घ्या आणि ORS/पाणी घ्या${prescriptionHint ? `; आधी दिलेली औषधे (${prescriptionHint}) डॉक्टर/आशा सेविकेची खात्री करूनच घ्या` : '; गरज असल्यास सामान्य OTC औषध डॉक्टर/आशा सेविकेला विचारून घ्या'}. औषध नेहमी मार्गदर्शनानेच घ्या.`;
    }
    if (symptomCount === 1) {
      return followUpQuestion.Marathi;
    }
    if (hasDiarrhea) {
      return 'जुलाब असल्यास ORS घ्या, स्वच्छ पाणी प्या, आणि तेलकट अन्न टाळा. अशक्तपणा वाढल्यास तात्काळ आशा सेविकेशी संपर्क करा.';
    }
    if (symptomCount >= 2) {
      return `तुमच्या लक्षणांनुसार (${symptomListText}) विश्रांती घ्या आणि पाणी/ORS घ्या${prescriptionHint ? `; आधीची औषधे (${prescriptionHint}) डॉक्टर/आशा सेविकेच्या खात्रीनंतरच घ्या` : '; सामान्य OTC औषधे डॉक्टर/आशा सेविकेच्या सल्ल्याने घ्या'}. औषध नेहमी मार्गदर्शनानेच घ्या.`;
    }
    if (hasVomiting || hasDehydration) {
      return 'उलटी किंवा डिहायड्रेशन असल्यास ORS आणि पाणी घ्या. त्रास वाढल्यास तात्काळ आशा सेविकेशी संपर्क करा.';
    }
    if (hasFever && hasCough) {
      return 'ताप आणि खोकल्यासाठी विश्रांती घ्या, पुरेसे पाणी प्या, आणि तापमान तपासा. 2-3 दिवसांत आराम न झाल्यास आशा सेविकेशी संपर्क करा.';
    }
    if (hasHeadache) {
      return 'डोकेदुखीसाठी विश्रांती घ्या, पाणी प्या, आणि तेज प्रकाश टाळा. त्रास वाढल्यास आरोग्य कर्मचाऱ्यांशी संपर्क करा.';
    }
    return 'कृपया तुमची लक्षणे थोडी अधिक सविस्तर सांगा. मी मदतीसाठी येथे आहे.';
  }

  if (hasChestPain || hasBreathingIssue) {
    return 'This may be serious. Please contact your ASHA worker or the nearest hospital immediately.';
  }
  if (newlyDetectedSymptoms.length > 0 && symptomCount >= 2) {
    return `I noted new symptoms: ${newlyAdded}. For ${symptomListText}, take rest and drink ORS/water${prescriptionHint ? `; previously prescribed medicine (${prescriptionHint}) can be considered only after ASHA/doctor confirmation` : '; common OTC options can be considered after ASHA/doctor advice'}. Take medicines only with doctor/ASHA guidance.`;
  }
  if (symptomCount === 1) {
    return followUpQuestion.English;
  }
  if (hasDiarrhea) {
    return 'For diarrhea, take ORS frequently, drink clean water, and avoid oily food. If weakness increases, contact an ASHA worker immediately.';
  }
  if (symptomCount >= 2) {
    return `Based on your symptoms (${symptomListText}), take rest and drink water/ORS${prescriptionHint ? `; previously prescribed medicine (${prescriptionHint}) should be reused only after confirmation` : '; common OTC options may help but only with ASHA/doctor advice'}. Take medicines only with doctor/ASHA guidance.`;
  }
  if (hasVomiting || hasDehydration) {
    return 'For vomiting or dehydration, sip ORS and water regularly. If weakness increases or vomiting continues, contact an ASHA worker immediately.';
  }
  if (hasFever && hasCough) {
    return 'For fever and cough, rest, drink fluids, and monitor temperature. If not improving in 2-3 days, contact an ASHA worker.';
  }
  if (hasHeadache) {
    return 'For headache, rest, hydrate, and avoid bright light. If pain worsens, contact a healthcare worker.';
  }
  if (conversationState === 'GREETING') {
    return language === 'Hindi'
      ? 'नमस्ते, आप अभी कौन-सी तकलीफ महसूस कर रहे हैं?'
      : language === 'Marathi'
      ? 'नमस्कार, तुम्हाला सध्या कोणता त्रास होत आहे?'
      : 'Hello, what problem are you facing right now?';
  }
  return language === 'Hindi'
    ? 'कृपया मुख्य लक्षण बताएं, जैसे बुखार, खांसी, उल्टी या शरीर दर्द।'
    : language === 'Marathi'
    ? 'कृपया मुख्य लक्षण सांगा, जसे ताप, खोकला, उलटी किंवा अंगदुखी.'
    : 'Please tell your main symptom, such as fever, cough, vomiting, or body pain.';
};

export const generateHealthAssistantReply = async ({
  userId,
  message,
  language = 'English',
  patientHistoryContext = '',
  recentChatHistory = [],
  detectedSymptoms = [],
  priorPrescriptions = [],
  conversationState = 'COLLECTING_SYMPTOMS',
  medicineIntent = false,
  symptomMemory = null,
}) => {
  const client = getClient();
  const languageInstruction = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES.English;

  const memoryTurns = getConversationContext(userId);
  const chatContext = [...recentChatHistory, ...memoryTurns]
    .slice(-10)
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
    .join('\n');

  const guidanceMode = detectedSymptoms.length >= 2;
  const symptomContext = detectedSymptoms.length ? detectedSymptoms.join(', ') : 'none detected yet';
  const memoryContext = symptomMemory
    ? JSON.stringify(symptomMemory, null, 2)
    : 'No structured memory yet';
  const priorPrescriptionContext = priorPrescriptions.length
    ? priorPrescriptions
        .map((item) => `${item.medicine_name}${item.dosage ? ` (${item.dosage})` : ''}${item.doctor_notes ? ` - ${item.doctor_notes}` : ''}`)
        .join('\n')
    : 'No known prior prescriptions';

  const instruction = `
You are a rural healthcare assistant helping villagers.
${languageInstruction}
Use simple and non-technical language.
Keep response under 3 sentences.
Never keep repeating "please describe symptoms".
If symptoms are unclear, ask ONE clear follow-up question only.
If symptoms are already enough, provide warm healthcare guidance in 2-3 sentences.
Do NOT put raw severity labels like "Severity: SEVERE" in the reply text.
You are NOT giving final diagnosis — only preliminary health support.
If severity seems moderate, suggest contacting ASHA worker.
If emergency symptoms appear, immediately warn patient to seek urgent care.
Emergency symptoms: chest pain, breathing difficulty, unconsciousness, severe vomiting, severe dehydration.
If prior prescriptions exist, mention those as previously prescribed and advise confirmation before reuse.
If prior prescriptions do not exist, suggest only common OTC options in safe generic terms.
Always include: "Take medicines only with doctor/ASHA guidance."
Current mode: ${guidanceMode ? 'GUIDANCE_MODE (symptoms already sufficient)' : 'FOLLOWUP_MODE (ask one useful question if needed)'}.
Conversation state: ${conversationState}
Medicine intent: ${medicineIntent ? 'YES' : 'NO'}

Return valid JSON only with keys:
{
  "reply": "string",
  "symptoms": ["symptom1", "symptom2"],
  "follow_up_needed": true
}

Detected Symptoms (this message):
${symptomContext}

Session Symptom Memory (accumulated):
${memoryContext}

Previous Prescriptions:
${priorPrescriptionContext}

Patient History:
${patientHistoryContext}

Conversation History:
${chatContext || 'No prior conversation'}

User Message:
${message}
`;

  const modelsToTry = [GEMINI_MODEL, ...MODEL_FALLBACKS].filter(
    (value, index, arr) => value && arr.indexOf(value) === index
  );

  let response;
  let lastError;
  for (const model of modelsToTry) {
    try {
      response = await client.models.generateContent({
        model,
        contents: instruction
      });
      break;
    } catch (error) {
      const isNotFound = error?.status === 404 || String(error?.message || '').includes('is not found');
      if (!isNotFound) {
        throw error;
      }
      lastError = error;
    }
  }

  if (!response) {
    const error = lastError || new Error('No compatible Gemini model found for generateContent');
    error.isGeminiUnavailable = true;
    throw error;
  }

  const rawText = response.text?.trim() || '';
  let parsed = {
    reply: rawText,
    symptoms: parseSymptoms(message),
    follow_up_needed: false
  };

  try {
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const data = JSON.parse(cleaned);
    parsed = {
      reply: data.reply || rawText,
      symptoms: Array.isArray(data.symptoms) ? data.symptoms : parseSymptoms(message),
      follow_up_needed: Boolean(data.follow_up_needed)
    };
  } catch (error) {
    parsed.symptoms = parseSymptoms(`${message} ${rawText}`);
  }

  memoryTurns.push({ role: 'user', content: message });
  memoryTurns.push({ role: 'assistant', content: parsed.reply });
  if (memoryTurns.length > 12) {
    memoryTurns.splice(0, memoryTurns.length - 12);
  }

  return parsed;
};
