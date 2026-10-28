import { query } from '../config/database.js';
import { normalizeSymptomMemory, EMPTY_SYMPTOM_MEMORY } from './symptomMemoryService.js';

export const createSession = async (userId, language = 'English') => {
  await query(
    `UPDATE chat_sessions SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
    [userId]
  );

  const result = await query(
    `INSERT INTO chat_sessions (user_id, session_title, symptom_memory, language, is_active, conversation_state)
     VALUES ($1, $2, $3, $4, TRUE, 'CONVERSATIONAL')
     RETURNING *`,
    [userId, 'New Health Chat', JSON.stringify(EMPTY_SYMPTOM_MEMORY()), language]
  );

  return result.rows[0];
};

export const getSessionById = async (sessionId, userId) => {
  const result = await query(
    `SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  return result.rows[0] || null;
};

export const getActiveSession = async (userId) => {
  const result = await query(
    `SELECT * FROM chat_sessions
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
};

export const listSessions = async (userId, limit = 30) => {
  const result = await query(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM chat_messages m WHERE m.session_id = s.id) AS message_count,
            (SELECT m.message FROM chat_messages m WHERE m.session_id = s.id AND m.sender_type = 'user'
             ORDER BY m.created_at ASC LIMIT 1) AS first_user_message
     FROM chat_sessions s
     WHERE s.user_id = $1
     ORDER BY s.updated_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
};

export const getSessionMessages = async (sessionId, limit = 100) => {
  const result = await query(
    `SELECT * FROM chat_messages
     WHERE session_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [sessionId, limit]
  );
  return result.rows;
};

export const deleteSession = async (sessionId, userId) => {
  const existing = await getSessionById(sessionId, userId);
  if (!existing) return null;

  await query(`DELETE FROM chat_messages WHERE session_id = $1`, [sessionId]);
  const result = await query(
    `DELETE FROM chat_sessions
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [sessionId, userId]
  );

  if (existing.is_active) {
    await query(
      `UPDATE chat_sessions
       SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = (
         SELECT id FROM chat_sessions
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 1
       )`,
      [userId]
    );
  }

  return result.rows[0] || null;
};

export const addMessage = async ({
  sessionId,
  senderType,
  message,
  detectedSymptoms = [],
  severity = null,
  severityReason = null,
  metadata = {},
}) => {
  const result = await query(
    `INSERT INTO chat_messages (session_id, sender_type, message, detected_symptoms, severity, severity_reason, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      sessionId,
      senderType,
      message,
      JSON.stringify(detectedSymptoms),
      severity,
      severityReason,
      JSON.stringify(metadata),
    ]
  );

  await query(
    `UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [sessionId]
  );

  return result.rows[0];
};

export const updateSession = async (sessionId, updates = {}) => {
  const fields = [];
  const values = [];
  let i = 1;

  if (updates.symptom_memory !== undefined) {
    fields.push(`symptom_memory = $${i++}`);
    values.push(JSON.stringify(normalizeSymptomMemory(updates.symptom_memory)));
  }
  if (updates.conversation_state !== undefined) {
    fields.push(`conversation_state = $${i++}`);
    values.push(updates.conversation_state);
  }
  if (updates.current_severity !== undefined) {
    fields.push(`current_severity = $${i++}`);
    values.push(updates.current_severity);
  }
  if (updates.session_title !== undefined) {
    fields.push(`session_title = $${i++}`);
    values.push(updates.session_title);
  }
  if (updates.language !== undefined) {
    fields.push(`language = $${i++}`);
    values.push(updates.language);
  }
  if (updates.risk_score !== undefined) {
    fields.push(`risk_score = $${i++}`);
    values.push(updates.risk_score);
  }
  if (updates.triage_status !== undefined) {
    fields.push(`triage_status = $${i++}`);
    values.push(updates.triage_status);
  }
  if (updates.structured_symptoms !== undefined) {
    fields.push(`structured_symptoms = $${i++}`);
    values.push(JSON.stringify(updates.structured_symptoms));
  }
  if (updates.health_memory !== undefined) {
    fields.push(`health_memory = $${i++}`);
    values.push(JSON.stringify(updates.health_memory));
  }
  if (updates.pending_escalation !== undefined) {
    fields.push(`pending_escalation = $${i++}`);
    values.push(updates.pending_escalation ? JSON.stringify(updates.pending_escalation) : null);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  if (!fields.length) return null;

  values.push(sessionId);
  const result = await query(
    `UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0];
};

export const generateSessionTitle = (message = '') => {
  const text = String(message).trim().slice(0, 60);
  if (!text) return 'Health Chat';
  return text.length < 50 ? text : `${text.slice(0, 47)}...`;
};

export const buildSymptomSummary = (memory, severityResult, language = 'English') => {
  const m = normalizeSymptomMemory(memory);
  const labels = {
    English: {
      fever: 'Fever',
      cough: 'Cough',
      headache: 'Headache',
      vomiting: 'Vomiting',
      diarrhea: 'Diarrhea',
      bodyPain: 'Body pain',
      fatigue: 'Fatigue',
      chestPain: 'Chest pain',
      breathingDifficulty: 'Breathing difficulty',
      dehydration: 'Dehydration',
      weakness: 'Weakness',
    },
    Hindi: {
      fever: 'बुखार',
      cough: 'खांसी',
      headache: 'सिरदर्द',
      vomiting: 'उल्टी',
      diarrhea: 'दस्त',
      bodyPain: 'शरीर दर्द',
      fatigue: 'थकान',
      chestPain: 'सीने में दर्द',
      breathingDifficulty: 'सांस की तकलीफ',
      dehydration: 'डिहाइड्रेशन',
      weakness: 'कमजोरी',
    },
    Marathi: {
      fever: 'ताप',
      cough: 'खोकला',
      headache: 'डोकेदुखी',
      vomiting: 'उलटी',
      diarrhea: 'जुलाब',
      bodyPain: 'अंगदुखी',
      fatigue: 'थकवा',
      chestPain: 'छातीत दुखणे',
      breathingDifficulty: 'श्वास त्रास',
      dehydration: 'डिहायड्रेशन',
      weakness: 'अशक्तपणा',
    },
  };

  const map = labels[language] || labels.English;
  const symptomList = Array.isArray(m.symptoms) && m.symptoms.length
    ? m.symptoms.map((s) => map[s] || map[s.replace(/\s/g, '')] || s)
    : Object.entries(map)
        .filter(([key]) => m[key])
        .map(([, label]) => label);

  return {
    symptoms: symptomList,
    duration: m.durationLabel || m.duration || 'Not specified',
    riskLevel: severityResult?.displayLevel || 'Assessing',
    recommendation: severityResult?.recommendation || '',
    severityReason: severityResult?.reasonText || '',
  };
};
