/** Varied conversational templates — avoids robotic repetition */

const hashPick = (seed, arr) => {
  if (!arr.length) return '';
  let h = 0;
  const s = String(seed || Date.now());
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % arr.length;
  return arr[h];
};

const DURATION_ACK = {
  English: (label) => [
    `Understood — this has been going on for ${label}.`,
    `Thanks, so the symptoms have been present for ${label}.`,
    `Got it — about ${label} now.`,
  ],
  Hindi: (label) => [`समझ गया — लगभग ${label} से है।`, `ठीक है, ${label} से लक्षण हैं।`],
  Marathi: (label) => [`समजले — सुमारे ${label} पासून आहे.`, `ठीक आहे, ${label} पासून लक्षणे आहेत.`],
};

const SYMPTOM_ACK = {
  English: (symptom) => [
    `I hear you're dealing with ${symptom}. I'll ask a couple of quick questions to understand better.`,
    `Thanks for sharing about the ${symptom}. Let me gather a little more information.`,
    `Okay — ${symptom} noted. A few short follow-ups will help me guide you.`,
  ],
  Hindi: (s) => [`समझ गया, ${s} है। कुछ छोटे सवाल पूछूँगा।`, `${s} के बारे में बताने के लिए धन्यवाद।`],
  Marathi: (s) => [`समजले, ${s} आहे. काही प्रश्न विचारतो.`, `${s} सांगितल्याबद्दल धन्यवाद.`],
};

const MILD_OPENING = {
  English: [
    'Current symptoms seem mild right now.',
    'At this stage the symptoms appear low risk.',
    'The symptoms currently do not indicate major concern.',
    'Based on what you shared, things look manageable for now.',
  ],
  Hindi: [
    'अभी लक्षण हल्के प्रतीत होते हैं।',
    'इस समय जोखिम कम लगता है।',
    'फिलहाल स्थिति संभालने योग्य लगती है।',
  ],
  Marathi: [
    'सध्या लक्षणे सौम्य दिसतात.',
    'या टप्प्यावर धोका कमी दिसतो.',
    'सांगितलेल्या माहितीनुसार परिस्थिती हाताळण्यायोग्य आहे.',
  ],
};

const MODERATE_OPENING = {
  English: [
    'Your symptoms suggest a moderate level of concern worth monitoring.',
    'This pattern may indicate a moderate illness — please keep a close watch.',
    'There is a moderate health concern based on what you described.',
  ],
  Hindi: ['लक्षण मध्यम स्तर का ध्यान देने योग्य हैं।', 'यह मध्यम स्तर की चिंता हो सकती है।'],
  Marathi: ['लक्षणे मध्यम स्तराची काळजी घेण्यासारखी आहेत.', 'मध्यम स्तराचा आरोग्य धोका दिसतो.'],
};

const SEVERE_OPENING = {
  English: [
    'These symptoms may need prompt medical attention.',
    'This combination raises a serious health concern.',
    'Please treat this as urgent and seek care soon.',
  ],
  Hindi: ['इन लक्षणों के लिए तुरंत चिकित्सा ध्यान जरूरी हो सकता है।'],
  Marathi: ['या लक्षणांसाठी तातडीची काळजी गरजेची असू शकते.'],
};

export const pickDurationAck = (language, durationLabel, seed) => {
  const pool = (DURATION_ACK[language] || DURATION_ACK.English)(durationLabel);
  return hashPick(seed, pool);
};

export const pickSymptomAck = (language, symptom, seed) => {
  const pool = (SYMPTOM_ACK[language] || SYMPTOM_ACK.English)(symptom);
  return hashPick(seed, pool);
};

export const pickGuidanceOpening = (language, level, seed) => {
  let pool = MILD_OPENING[language] || MILD_OPENING.English;
  if (level === 'MODERATE' || level === 'Moderate') {
    pool = MODERATE_OPENING[language] || MODERATE_OPENING.English;
  }
  if (level === 'SEVERE' || level === 'Critical' || level === 'Severe') {
    pool = SEVERE_OPENING[language] || SEVERE_OPENING.English;
  }
  return hashPick(seed, pool);
};

export const pickQuestionVariant = (key, language, vars, seed) => {
  const variants = {
    duration: {
      English: [
        'Since when have you been experiencing {symptom}?',
        'How long have you had {symptom}?',
        'When did the {symptom} start?',
      ],
      Hindi: ['{symptom} कब से है?', 'आपको {symptom} कितने समय से है?'],
      Marathi: ['{symptom} कधीपासून आहे?', '{symptom} किती काळापासून आहे?'],
    },
    additional_symptoms: {
      English: [
        'Do you also have fever, cough, or weakness along with {symptom}?',
        'Besides {symptom}, any fever, cough, or weakness?',
        'Are there any other symptoms like fever, cough, or weakness?',
      ],
      Hindi: ['{symptom} के अलावा बुखार, खांसी या कमजोरी भी है?'],
      Marathi: ['{symptom} व्यतिरिक्त ताप, खोकला किंवा अशक्तपणा आहे का?'],
    },
  };
  const pool = variants[key]?.[language] || variants[key]?.English || [''];
  let q = hashPick(seed, pool);
  Object.entries(vars || {}).forEach(([k, v]) => {
    q = q.replace(`{${k}}`, v);
  });
  return q;
};
