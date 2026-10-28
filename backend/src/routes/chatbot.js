import express from 'express';
import { query } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';
import { canAccessUserData } from '../middleware/authorization.js';
import { detectSymptoms } from '../services/severityEngine.js';
import { formatHistoryForPrompt, getPatientHistoryContext } from '../services/patientHistoryService.js';
import { runTriageAutomation } from '../services/notificationService.js';
import { buildStructuredSymptoms } from '../services/riskScoringService.js';
import { triageToLegacySeverity } from '../services/riskScoringService.js';
import {
  accumulateSymptomsFromMessage,
  getStructuredSymptomSnapshot,
} from '../services/symptomAccumulatorService.js';
import { analyzeHealthTurn, buildFallbackAnalysis } from '../services/groqTriageService.js';
import { finalizeTriageDecision } from '../services/triageSafetyService.js';
import { getHealthMemoryFromSession } from '../services/healthMemoryService.js';
import { normalizeSymptomMemory } from '../services/symptomMemoryService.js';
import {
  createSession,
  getSessionById,
  listSessions,
  getSessionMessages,
  deleteSession,
  addMessage,
  updateSession,
  generateSessionTitle,
  buildSymptomSummary,
} from '../services/chatSessionService.js';

const router = express.Router();
const SUPPORTED_LANGUAGES = ['English', 'Hindi', 'Marathi'];
const CONVERSATION_STATE = 'CONVERSATIONAL';

const buildEscalationRequest = ({
  triageStatus,
  riskScore,
  triageLabel,
  escalationRoute,
  aiSummary,
  structuredSymptoms,
  scoreReasons,
}) => {
  if (triageStatus === 'LOW') return null;
  const target = triageStatus === 'DOCTOR_ESCALATED' ? 'doctor and ASHA worker' : 'ASHA worker';
  return {
    triageStatus,
    riskScore,
    triageLabel,
    escalationRoute,
    target,
    aiSummary,
    structuredSymptoms,
    scoreReasons,
    consentRequired: true,
    status: 'pending_user_consent',
  };
};

const authorizeUserId = async (req, res, userId) => {
  req.params.userId = String(userId);
  let authorized = false;
  await canAccessUserData(req, res, () => {
    authorized = true;
  });
  return authorized;
};

router.get('/sessions/:userId', authenticateUser, canAccessUserData, async (req, res) => {
  try {
    const sessions = await listSessions(req.params.userId);
    return res.json(sessions);
  } catch (error) {
    console.error('List sessions error:', error);
    return res.status(500).json({ error: 'Failed to list chat sessions' });
  }
});

router.get('/sessions/:userId/:sessionId', authenticateUser, canAccessUserData, async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    const session = await getSessionById(sessionId, userId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const messages = await getSessionMessages(sessionId);
    const memory = normalizeSymptomMemory(session.symptom_memory);
    const healthMemory = getHealthMemoryFromSession(session);
    const severityResult = session.current_severity
      ? { level: session.current_severity, displayLevel: session.current_severity }
      : null;

    return res.json({
      ...session,
      symptom_memory: memory,
      health_memory: healthMemory,
      symptom_summary: buildSymptomSummary(memory, severityResult, session.language),
      messages,
    });
  } catch (error) {
    console.error('Get session error:', error);
    return res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.delete('/sessions/:userId/:sessionId', authenticateUser, canAccessUserData, async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    const deleted = await deleteSession(sessionId, userId);
    if (!deleted) return res.status(404).json({ error: 'Session not found' });
    return res.json({ success: true, deleted_session_id: deleted.id });
  } catch (error) {
    console.error('Delete session error:', error);
    return res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

router.post('/sessions', authenticateUser, async (req, res) => {
  try {
    const { userId, language = 'English' } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ error: 'Invalid language' });
    }
    if (!(await authorizeUserId(req, res, userId))) return;

    const session = await createSession(userId, language);
    return res.json({
      session_id: session.id,
      session_title: session.session_title,
      symptom_memory: normalizeSymptomMemory(session.symptom_memory),
      health_memory: getHealthMemoryFromSession(session),
      conversation_state: CONVERSATION_STATE,
    });
  } catch (error) {
    console.error('Create session error:', error);
    return res.status(500).json({ error: 'Failed to create chat session' });
  }
});

router.get('/history/:userId', authenticateUser, canAccessUserData, async (req, res) => {
  try {
    const sessions = await listSessions(req.params.userId);
    return res.json(sessions);
  } catch (error) {
    console.error('Chat history fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

router.post('/reset', authenticateUser, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!(await authorizeUserId(req, res, userId))) return;

    await query(`UPDATE chat_sessions SET is_active = FALSE WHERE user_id = $1`, [userId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Chat reset error:', error);
    return res.status(500).json({ error: 'Failed to reset chat state' });
  }
});

router.post('/message', authenticateUser, async (req, res) => {
  try {
    const { userId, message, language, sessionId } = req.body;

    if (!userId || !message || !String(message).trim()) {
      return res.status(400).json({ error: 'userId and message are required' });
    }
    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId is required. Please start a New Chat first.',
      });
    }
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({ error: 'language must be English, Hindi, or Marathi' });
    }
    if (!(await authorizeUserId(req, res, userId))) return;

    const session = await getSessionById(sessionId, userId);
    if (!session) return res.status(404).json({ error: 'Chat session not found' });

    const messageSymptoms = detectSymptoms(message);
    let symptomMemory = accumulateSymptomsFromMessage(session.symptom_memory, message);
    const priorHealthMemory = getHealthMemoryFromSession(session);

    await addMessage({
      sessionId,
      senderType: 'user',
      message,
      detectedSymptoms: messageSymptoms,
    });

    const priorMessages = await getSessionMessages(sessionId);
    const isFirstUserMessage = priorMessages.filter((m) => m.sender_type === 'user').length === 1;
    if (isFirstUserMessage) {
      await updateSession(sessionId, {
        session_title: generateSessionTitle(message),
        language,
      });
    }

    const patientHistory = await getPatientHistoryContext(userId);
    const patientHistoryContext = formatHistoryForPrompt(patientHistory);
    const symptomSnapshot = getStructuredSymptomSnapshot(symptomMemory);

    let groqAnalysis;
    let botReplyText;
    let aiModel = null;

    try {
      const groqResult = await analyzeHealthTurn({
        healthMemory: priorHealthMemory,
        priorMessages,
        userMessage: message,
        language,
        patientHistoryContext,
      });
      groqAnalysis = groqResult.analysis;
      botReplyText = groqAnalysis.assistantResponse;
      aiModel = groqResult.model;
    } catch (aiError) {
      console.error('Groq triage error:', aiError?.message || aiError);
      groqAnalysis = buildFallbackAnalysis(language);
      botReplyText = groqAnalysis.assistantResponse;
    }

    const triageFinal = finalizeTriageDecision({
      groqAnalysis,
      healthMemory: priorHealthMemory,
      snapshot: symptomSnapshot,
      message,
      messageSymptoms,
      language,
    });

    const {
      healthMemory,
      riskScore,
      triageStatus,
      escalationRoute,
      allowAutomation,
      scoreReasons,
      triageLabel,
      recommendation,
      aiSummary,
    } = triageFinal;

    const severity = triageToLegacySeverity(triageStatus);
    const structuredSymptoms = {
      ...buildStructuredSymptoms(symptomSnapshot),
      aiSummary,
      trend: healthMemory.trend,
      escalationRoute,
    };

    const escalationRequest = allowAutomation
      ? buildEscalationRequest({
          triageStatus,
          riskScore,
          triageLabel,
          escalationRoute,
          aiSummary,
          structuredSymptoms,
          scoreReasons,
        })
      : null;

    const pendingEscalation = escalationRequest
      ? {
          ...escalationRequest,
          originalMessage: message,
          createdAt: new Date().toISOString(),
        }
      : null;

    const showSeverity = riskScore > 0 || (healthMemory.currentSymptoms?.length > 0);
    const severityLine = showSeverity
      ? `Risk Level: ${triageLabel} (Score ${riskScore}/100) · Trend: ${healthMemory.trend}`
      : null;

    symptomMemory = {
      ...symptomMemory,
      severity,
      triageStatus,
      riskScore,
      structuredSymptoms,
      healthMemory,
    };

    await addMessage({
      sessionId,
      senderType: 'bot',
      message: botReplyText,
      detectedSymptoms: messageSymptoms,
      severity,
      severityReason: aiSummary || null,
      metadata: {
        severity_line: severityLine,
        show_severity: showSeverity,
        ai_model: aiModel,
        risk_score: riskScore,
        triage_status: triageStatus,
        escalation_route: escalationRoute,
        trend: healthMemory.trend,
        health_memory: healthMemory,
        escalation_request: escalationRequest,
      },
    });

    await updateSession(sessionId, {
      symptom_memory: symptomMemory,
      health_memory: healthMemory,
      conversation_state: CONVERSATION_STATE,
      current_severity: severity,
      language,
      risk_score: riskScore,
      triage_status: triageStatus,
      structured_symptoms: structuredSymptoms,
      pending_escalation: pendingEscalation,
    });

    const symptomSummary = {
      ...buildSymptomSummary(symptomMemory, { displayLevel: triageLabel, recommendation }, language),
      riskScore,
      triageStatus,
      triageLabel,
      trend: healthMemory.trend,
      escalationRoute,
      aiSummary,
      structuredSymptoms,
      healthMemory,
      escalationRequest,
    };

    await query(
      `INSERT INTO chat_history (user_id, user_message, bot_response, detected_symptoms, severity, language)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, message, botReplyText, JSON.stringify(messageSymptoms), severity, language]
    );

    const updatedSession = await getSessionById(sessionId, userId);

    return res.json({
      reply: botReplyText,
      severity,
      risk_score: riskScore,
      triage_status: triageStatus,
      triage_label: triageLabel,
      severity_label: triageLabel,
      severity_reason: aiSummary || null,
      escalation_reasons: scoreReasons,
      escalation_route: escalationRoute,
      trend: healthMemory.trend,
      severity_line: showSeverity ? severityLine : null,
      recommendation,
      structured_symptoms: structuredSymptoms,
      health_memory: healthMemory,
      symptoms_detected: messageSymptoms,
      symptom_memory: symptomMemory,
      symptom_snapshot: symptomSnapshot,
      symptom_summary: symptomSummary,
      conversation_state: CONVERSATION_STATE,
      session_id: sessionId,
      session_title: updatedSession?.session_title,
      quick_replies: [],
      follow_up_needed: false,
      escalation_request: escalationRequest,
      ai_provider: 'groq',
      ai_model: aiModel,
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    return res.status(500).json({ error: 'Failed to process chatbot message' });
  }
});

router.post('/escalation-consent', authenticateUser, async (req, res) => {
  try {
    const { userId, sessionId, consent } = req.body;
    if (!userId || !sessionId) {
      return res.status(400).json({ error: 'userId and sessionId are required' });
    }
    if (!(await authorizeUserId(req, res, userId))) return;

    const session = await getSessionById(sessionId, userId);
    if (!session) return res.status(404).json({ error: 'Chat session not found' });

    const pending = session.pending_escalation;
    if (!pending?.triageStatus || pending.status !== 'pending_user_consent') {
      return res.status(400).json({ error: 'No pending escalation permission request found' });
    }

    if (!consent) {
      await updateSession(sessionId, { pending_escalation: null });
      await addMessage({
        sessionId,
        senderType: 'bot',
        message:
          'Okay, I will not forward this case. Please seek urgent care directly if symptoms worsen or you feel unsafe.',
        metadata: {
          escalation_consent: 'declined',
          triage_status: pending.triageStatus,
          risk_score: pending.riskScore,
        },
      });
      return res.json({
        status: 'declined',
        message:
          'Forwarding cancelled. Please seek urgent care directly if symptoms worsen or you feel unsafe.',
      });
    }

    const result = await runTriageAutomation({
      userId,
      triageStatus: pending.triageStatus,
      riskScore: pending.riskScore,
      originalMessage: pending.originalMessage,
      structuredSymptoms: pending.structuredSymptoms,
      scoreReasons: pending.scoreReasons || [],
      allowAutomation: true,
      aiSummary: pending.aiSummary,
    });

    await updateSession(sessionId, { pending_escalation: null });
    await addMessage({
      sessionId,
      senderType: 'bot',
      message:
        pending.triageStatus === 'DOCTOR_ESCALATED'
          ? 'Thanks. I have forwarded this case for doctor review and alerted your ASHA worker if assigned.'
          : 'Thanks. I have forwarded this case to your ASHA worker for follow-up.',
      metadata: {
        escalation_consent: 'approved',
        triage_status: pending.triageStatus,
        risk_score: pending.riskScore,
        automation_result: result,
      },
    });

    return res.json({
      status: 'approved',
      message:
        pending.triageStatus === 'DOCTOR_ESCALATED'
          ? 'Case forwarded for doctor review.'
          : 'Case forwarded to ASHA worker.',
      result,
    });
  } catch (error) {
    console.error('Escalation consent error:', error);
    return res.status(500).json({ error: 'Failed to update escalation permission' });
  }
});

export default router;
