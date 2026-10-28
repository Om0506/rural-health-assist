import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FaBars,
  FaCheckCircle,
  FaPaperPlane,
  FaPaperclip,
  FaPlus,
  FaRobot,
  FaSearch,
  FaTimes,
  FaTrash,
  FaUser,
  FaMicrophone,
  FaMagic,
  FaVolumeUp,
  FaVolumeMute,
  FaStop,
} from 'react-icons/fa';
import { chatbotAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext.jsx';
import { cn } from '../utils/cn';
import SymptomSummaryPanel from './chatbot/SymptomSummaryPanel.jsx';
import VoiceChatOverlay from './chatbot/VoiceChatOverlay.jsx';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { detectLanguageFromText } from '../utils/i18nHealthcare';
import { fromApiLanguage, toApiLanguage } from '../i18n';

const DEFAULT_QUICK_REPLIES = [
  'I have fever',
  'I have cough',
  'Since today',
  'More than 2 days',
  'Yes',
  'No',
];

const SEVERITY_BADGE = {
  Low: 'chat-msg-severity--low',
  Moderate: 'chat-msg-severity--moderate',
  Severe: 'chat-msg-severity--severe',
  Critical: 'chat-msg-severity--critical',
  Assessing: 'chat-msg-severity--assessing',
};

function TypingIndicator({ isAssistant }) {
  return (
    <div className="flex justify-start">
      <div
        className={cn(
          'flex items-center gap-2 rounded-2xl px-4 py-3',
          isAssistant
            ? 'bg-brand-50 border border-brand-100 dark:bg-brand-950/30 dark:border-brand-900/50'
            : 'border border-default bg-card'
        )}
      >
        <FaRobot className="h-3 w-3 text-brand-600" />
        <div className="assistant-typing-dots" aria-label="Assistant is typing">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function Chatbot({ userId, variant = 'default', focusRequest = 0 }) {
  const { t, language } = useLanguage();
  const isAssistant = variant === 'assistant';
  const debugSymptomsEnabled = import.meta.env.VITE_CHATBOT_DEBUG === 'true';

  const [selectedLanguage, setSelectedLanguage] = useState(() => toApiLanguage(language));
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [symptomSummary, setSymptomSummary] = useState(null);
  const [quickReplies, setQuickReplies] = useState(DEFAULT_QUICK_REPLIES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastDetectedSymptoms, setLastDetectedSymptoms] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [escalationRequest, setEscalationRequest] = useState(null);
  const [isSubmittingConsent, setIsSubmittingConsent] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const handleSendRef = useRef(null);
  const speakRef = useRef(null);
  const soundEnabledRef = useRef(true);

  const {
    isSupported: isVoiceSupported,
    isListening,
    isSpeaking,
    speakingMessageId,
    soundEnabled,
    transcript,
    interimTranscript,
    volumeLevel,
    error: voiceError,
    startListening,
    stopListening,
    clearTranscript,
    setTranscript,
    speak,
    stopSpeaking,
    toggleSound,
  } = useVoiceChat({
    language: selectedLanguage,
    autoSendEnabled,
    onAutoSend: (text) => {
      setIsVoiceOpen(false);
      handleSendRef.current?.(text);
      clearTranscript();
    },
  });

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const makeGreeting = useCallback(
    () => ({
      id: 'greeting',
      text: t('Chatbot greeting'),
      sender: 'bot',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }),
    [t]
  );

  const localizedQuickReplies = useCallback(
    () => DEFAULT_QUICK_REPLIES.map((item) => t(item)),
    [t]
  );

  const formatSeverityLabel = (level) => {
    const map = {
      LOW: 'Low',
      MODERATE: 'Moderate',
      SEVERE: 'Severe',
      CRITICAL: 'Critical',
    };
    return map[level] || level;
  };

  const parseMetadata = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const mapApiMessage = (row) => {
    const meta = parseMetadata(row.metadata);
    const showSeverity = meta.show_severity ?? Boolean(row.severity);
    return {
      id: row.id,
      text: row.message,
      sender: row.sender_type === 'user' ? 'user' : 'bot',
      time: new Date(row.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      severityLabel: showSeverity && row.severity ? formatSeverityLabel(row.severity) : null,
      severityLine: meta.severity_line || row.severity_reason || null,
      showSeverity,
    };
  };

  const refreshSessions = useCallback(async () => {
    if (!userId) return [];
    const result = await chatbotAPI.getSessions(userId);
    const rows = result?.data || [];
    setSessions(rows);
    return rows;
  }, [userId]);

  const applySessionData = useCallback(
    (data) => {
      setSessionId(data.id);
      setSelectedLanguage(data.language || 'English');
      const dbMessages = (data.messages || []).map(mapApiMessage);
      setMessages(dbMessages.length ? dbMessages : [makeGreeting()]);
      setSymptomSummary(
        data.symptom_summary ||
          buildSummaryFromMemory(data.symptom_memory, data.current_severity)
      );
      setEscalationRequest(
        data.pending_escalation?.status === 'pending_user_consent' ? data.pending_escalation : null
      );
    },
    [makeGreeting]
  );

  const buildSummaryFromMemory = (memory, severity) => {
    if (!memory) return null;
    const symptoms = [];
    const labels = {
      fever: 'Fever',
      cough: 'Cough',
      headache: 'Headache',
      weakness: 'Weakness',
      breathingDifficulty: 'Breathing difficulty',
      chestPain: 'Chest pain',
    };
    Object.entries(labels).forEach(([key, label]) => {
      if (memory[key]) symptoms.push(label);
    });
    return {
      symptoms,
      duration: memory.duration || 'Not specified',
      riskLevel: severity ? formatSeverityLabel(severity) : 'Assessing',
      recommendation: '',
      severityReason: '',
    };
  };

  const loadSession = useCallback(
    async (id) => {
      if (!userId || !id) return;
      try {
        const result = await chatbotAPI.getSession(userId, id);
        applySessionData(result.data);
        setShowSidebar(false);
      } catch (error) {
        console.error('Failed to load session:', error);
      }
    },
    [userId, applySessionData]
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (focusRequest > 0) inputRef.current?.focus();
  }, [focusRequest]);

  useEffect(() => {
    setSelectedLanguage(toApiLanguage(language));
    setQuickReplies(localizedQuickReplies());
  }, [language, localizedQuickReplies]);

  useEffect(() => {
    const init = async () => {
      if (!userId) return;
      try {
        const rows = await refreshSessions();
        const active = rows.find((s) => s.is_active);
        if (active?.id) {
          await loadSession(active.id);
        } else {
          setMessages([makeGreeting()]);
        }
      } catch (error) {
        console.error('Failed to init chatbot:', error);
        setMessages([makeGreeting()]);
      }
    };
    init();
  }, [userId, refreshSessions, loadSession, makeGreeting]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartNewChat = async () => {
    if (!userId) return;
    try {
      const result = await chatbotAPI.createSession({
        userId,
        language: selectedLanguage,
      });
      const data = result?.data || {};
      setSessionId(data.session_id);
      setMessages([makeGreeting()]);
      setSymptomSummary(null);
      setEscalationRequest(null);
      setQuickReplies(localizedQuickReplies());
      setLastDetectedSymptoms([]);
      setInput('');
      setShowSidebar(false);
      await refreshSessions();
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to create chat session:', error);
    }
  };

  const handleDeleteSession = async () => {
    if (!userId || !deleteConfirm?.id) return;
    setDeletingSessionId(deleteConfirm.id);
    setDeleteError('');
    try {
      await chatbotAPI.deleteSession(userId, deleteConfirm.id);
      const rows = await refreshSessions();
      if (String(sessionId) === String(deleteConfirm.id)) {
        const active = rows.find((s) => s.is_active) || rows[0];
        if (active?.id) {
          await loadSession(active.id);
        } else {
          setSessionId(null);
          setMessages([makeGreeting()]);
          setSymptomSummary(null);
          setEscalationRequest(null);
          setQuickReplies(localizedQuickReplies());
        }
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      setDeleteError(error?.response?.data?.error || 'Failed to delete chat.');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleSend = async (prefilledMessage) => {
    const outgoingText = (prefilledMessage ?? input).trim();
    if (!outgoingText) return;
    const detectedUiLanguage = detectLanguageFromText(outgoingText, fromApiLanguage(selectedLanguage));
    const messageLanguage = toApiLanguage(detectedUiLanguage);
    if (messageLanguage !== selectedLanguage) setSelectedLanguage(messageLanguage);

    let currentSessionId = sessionId;
    if (!currentSessionId && userId) {
      try {
        const createRes = await chatbotAPI.createSession({
          userId,
          language: messageLanguage || selectedLanguage,
        });
        currentSessionId = createRes?.data?.session_id;
        if (currentSessionId) {
          setSessionId(currentSessionId);
          await refreshSessions();
        }
      } catch (err) {
        console.error('Failed to auto-create chat session:', err);
      }
    }

    if (!currentSessionId) {
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          text: outgoingText,
          sender: 'user',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: `sys-${Date.now()}`,
          text: t('Please tap "New Chat" to start a health assessment conversation.'),
          sender: 'system',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setInput('');
      return;
    }

    stopSpeaking();

    const userMessageId = `user-${Date.now()}`;
    const userMessage = {
      id: userMessageId,
      text: outgoingText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatbotAPI.sendMessage({
        userId,
        sessionId: currentSessionId,
        message: outgoingText,
        language: messageLanguage,
      });

      const data = response?.data || {};
      const botReply = data.reply || t('Chatbot default response');
      const symptoms = data.symptoms_detected || [];
      setLastDetectedSymptoms(symptoms);

      if (data.symptom_summary) setSymptomSummary(data.symptom_summary);
      setEscalationRequest(data.escalation_request || null);
      if (data.quick_replies?.length) {
        setQuickReplies(data.quick_replies.map((item) => t(item, { defaultValue: item })));
      }
      if (import.meta.env.VITE_CHATBOT_DEBUG === 'true' && data.current_stage) {
        console.debug('[chatbot]', data.current_stage, data.detected_intent);
      }

      const severityLabel =
        data.triage_label || data.severity_label || (data.severity ? formatSeverityLabel(data.severity) : null);

      const botMessageId = `bot-${Date.now()}`;
      const botMessage = {
        id: botMessageId,
        text: botReply,
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severityLabel: data.severity_line || data.triage_status ? severityLabel : null,
        severityLine: data.severity_line || data.severity_reason || null,
        showSeverity: Boolean(data.severity_line || data.triage_status),
      };
      setMessages((prev) => [...prev, botMessage]);
      await refreshSessions();

      if (soundEnabledRef.current && speakRef.current) {
        speakRef.current(botReply, messageLanguage, botMessageId);
      }
    } catch (error) {
      console.error('Error sending chatbot message:', error);
      const errMsg =
        error?.response?.data?.error ||
        'Unable to contact health assistant right now. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          text: errMsg,
          sender: 'system',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  const handleEscalationConsent = async (consent) => {
    if (!userId || !sessionId || !escalationRequest) return;
    setIsSubmittingConsent(true);
    try {
      const response = await chatbotAPI.submitEscalationConsent({
        userId,
        sessionId,
        consent,
      });
      const messageText =
        response?.data?.message ||
        (consent
          ? 'Your case has been forwarded.'
          : 'Forwarding cancelled. Please seek urgent care if symptoms worsen.');
      setEscalationRequest(null);
      setMessages((prev) => [
        ...prev,
        {
          text: messageText,
          sender: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      await refreshSessions();
    } catch (error) {
      console.error('Error submitting escalation consent:', error);
      setMessages((prev) => [
        ...prev,
        {
          text:
            error?.response?.data?.error ||
            'Unable to update forwarding permission right now. Please try again.',
          sender: 'system',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSubmittingConsent(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const formatHistoryTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  const filteredSessions = sessions.filter((s) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    const title = (s.session_title || s.first_user_message || '').toLowerCase();
    return title.includes(q);
  });

  const sidebar = (
    <>
      {showSidebar && (
        <div
          className="absolute inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setShowSidebar(false)}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'assistant-chat-sidebar',
          showSidebar ? 'assistant-chat-sidebar--open' : 'assistant-chat-sidebar--closed'
        )}
      >
        <div className="assistant-chat-sidebar-head">
          <h4>{t('Chat History')}</h4>
          {isAssistant ? (
            <button
              type="button"
              className="assistant-chat-icon-btn md:hidden"
              onClick={() => setShowSidebar(false)}
              aria-label="Close history"
            >
              <FaTimes className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSidebar(false)}
              className="text-muted-fg md:hidden"
              aria-label="Close history"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {isAssistant && (
          <div className="assistant-chat-sidebar-search">
            <FaSearch className="h-3 w-3 shrink-0 text-muted-fg" />
            <input
              type="search"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder={t('Search chats')}
              className="min-w-0 flex-1 bg-transparent text-xs text-fg placeholder:text-muted-fg focus:outline-none"
            />
          </div>
        )}

        <div className="assistant-chat-sidebar-new">
          <button type="button" onClick={handleStartNewChat} className="assistant-chat-new-btn">
            <FaPlus className="h-3.5 w-3.5" />
            {t('New Chat')}
          </button>
        </div>

        <div className="assistant-chat-history-list scrollbar-thin">
          {filteredSessions.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-fg">{t('No previous chats yet.')}</p>
          )}
          {filteredSessions.map((row) => (
            <div
              key={row.id}
              className={cn(
                'assistant-chat-history-item',
                sessionId === row.id && 'assistant-chat-history-item--active'
              )}
            >
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => loadSession(row.id)}>
              <p className="assistant-chat-history-title">
                {row.session_title || row.first_user_message || t('Health Chat')}
              </p>
              <p className="assistant-chat-history-meta">
                {formatHistoryTime(row.updated_at)}
                {row.message_count ? ` · ${row.message_count} msgs` : ''}
              </p>
              </button>
              <button
                type="button"
                className="ml-2 rounded-lg p-2 text-muted-fg transition hover:bg-red-500/10 hover:text-red-600"
                onClick={() => {
                  setDeleteError('');
                  setDeleteConfirm(row);
                }}
                aria-label="Delete chat"
                title="Delete chat"
              >
                <FaTrash className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );

  const messageArea = (
    <div className={cn('relative flex flex-1 flex-col min-h-0', !isAssistant && 'flex-col')}>
      <div
        className={cn(
          isAssistant
            ? 'assistant-chat-header'
            : 'flex items-center gap-2 bg-gradient-to-r from-brand-700 to-brand-600 p-4 text-white'
        )}
      >
        {isAssistant ? (
          <>
            <button
              type="button"
              onClick={() => setShowSidebar(true)}
              className="assistant-chat-icon-btn md:hidden"
              aria-label="Open history"
            >
              <FaBars className="h-4 w-4" />
            </button>
            <div className="assistant-chat-header-avatar">
              <FaRobot className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-fg">{t('Health Assistant')}</h3>
                <span className="assistant-chat-online">
                  <span className="assistant-chat-online-dot" />
                  {t('Online')}
                </span>
                {!sessionId && (
                  <span className="text-[10px] text-amber-600 font-medium">
                    {t('Start with New Chat')}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-fg">
                {t('Preliminary health support — not a diagnosis. Consult ASHA or doctor if needed.')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsVoiceOpen(true);
                startListening();
              }}
              className="flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
              title={t('Voice Chat', { defaultValue: 'Voice Chat' })}
              aria-label="Open voice chat"
            >
              <FaMagic className="h-3 w-3 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">{t('Live Voice', { defaultValue: 'Live Voice' })}</span>
              <FaMicrophone className="h-3 w-3 text-teal-600 sm:hidden dark:text-teal-400" />
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border transition',
                soundEnabled
                  ? 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                  : 'border-default bg-card-secondary text-muted-fg hover:text-fg'
              )}
              title={soundEnabled ? t('Mute spoken responses', { defaultValue: 'Mute spoken responses' }) : t('Unmute spoken responses', { defaultValue: 'Unmute spoken responses' })}
              aria-label={soundEnabled ? 'Mute spoken responses' : 'Unmute spoken responses'}
            >
              {soundEnabled ? <FaVolumeUp className="h-3 w-3" /> : <FaVolumeMute className="h-3 w-3" />}
            </button>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="assistant-chat-lang-select"
              aria-label="Chat language"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Marathi">Marathi</option>
            </select>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowSidebar(true)}
              className="text-white md:hidden"
              aria-label="Open history"
            >
              <FaBars />
            </button>
            <FaRobot className="text-2xl" />
            <div>
              <h3 className="font-bold">{t('Health Assistant')}</h3>
              <p className="text-xs text-green-100">{t('Online - Ask me anything')}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsVoiceOpen(true);
                  startListening();
                }}
                className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/20"
                title={t('Voice Chat', { defaultValue: 'Voice Chat' })}
                aria-label="Open voice chat"
              >
                <FaMagic className="h-3 w-3" />
                <span className="hidden sm:inline">{t('Live Voice', { defaultValue: 'Live Voice' })}</span>
                <FaMicrophone className="h-3 w-3 sm:hidden" />
              </button>
              <button
                type="button"
                onClick={toggleSound}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20',
                  !soundEnabled && 'opacity-60'
                )}
                title={soundEnabled ? t('Mute spoken responses', { defaultValue: 'Mute spoken responses' }) : t('Unmute spoken responses', { defaultValue: 'Unmute spoken responses' })}
                aria-label={soundEnabled ? 'Mute spoken responses' : 'Unmute spoken responses'}
              >
                {soundEnabled ? <FaVolumeUp className="h-3 w-3" /> : <FaVolumeMute className="h-3 w-3" />}
              </button>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="rounded-lg border-0 bg-white/15 px-2 py-1 text-xs text-white backdrop-blur [&>option]:text-black"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className={cn('flex flex-1 min-h-0', isAssistant && 'assistant-chat-body')}>
        <div
          className={cn(
            'flex-1 overflow-y-auto scrollbar-thin',
            isAssistant ? 'assistant-chat-messages' : 'space-y-4 bg-app/50 p-4'
          )}
          style={!isAssistant ? { maxHeight: '400px' } : undefined}
        >
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={cn('flex', message.sender === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'flex items-end gap-2 max-w-[85%] sm:max-w-[75%]',
                  message.sender === 'user' && 'flex-row-reverse'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    message.sender === 'user'
                      ? 'bg-teal-600 text-white'
                      : message.sender === 'system'
                      ? 'bg-amber-500 text-white'
                      : isAssistant
                      ? 'bg-brand-100 text-brand-600 dark:bg-brand-600 dark:text-white'
                      : 'bg-brand-600 text-white'
                  )}
                >
                  {message.sender === 'user' ? (
                    <FaUser className="text-xs" />
                  ) : (
                    <FaRobot className="text-xs" />
                  )}
                </div>

                <div className="min-w-0">
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      message.sender === 'user'
                        ? 'bg-teal-600 text-white rounded-br-md'
                        : message.sender === 'system'
                        ? 'bg-amber-500 text-white'
                        : isAssistant
                        ? 'bg-brand-50 text-fg border border-brand-100 rounded-bl-md dark:bg-brand-950/40 dark:border-brand-900/50'
                        : 'border border-default bg-card text-fg'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    {message.severityLabel && (
                      <div className="mt-2.5 space-y-1 border-t border-brand-100/80 pt-2 dark:border-brand-900/50">
                        {message.severityLine && (
                          <p className="text-xs text-muted-fg leading-relaxed">{message.severityLine}</p>
                        )}
                        <span
                          className={cn(
                            'chat-msg-severity',
                            SEVERITY_BADGE[message.severityLabel] || SEVERITY_BADGE.Assessing
                          )}
                        >
                          {t('Severity Level')}: {message.severityLabel}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 px-1 text-[10px] text-muted-fg">
                    <span>{message.time}</span>
                    {message.sender === 'bot' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isSpeaking && speakingMessageId === message.id) {
                            stopSpeaking();
                          } else {
                            speak(message.text, selectedLanguage, message.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] text-muted-fg transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-300"
                        title={
                          isSpeaking && speakingMessageId === message.id
                            ? t('Stop speaking', { defaultValue: 'Stop speaking' })
                            : t('Listen to message', { defaultValue: 'Listen to message' })
                        }
                        aria-label={
                          isSpeaking && speakingMessageId === message.id
                            ? 'Stop speaking'
                            : 'Listen to message'
                        }
                      >
                        {isSpeaking && speakingMessageId === message.id ? (
                          <>
                            <FaStop className="h-2.5 w-2.5 text-rose-500 animate-pulse" />
                            <span className="font-medium text-rose-500">{t('Stop', { defaultValue: 'Stop' })}</span>
                          </>
                        ) : (
                          <>
                            <FaVolumeUp className="h-2.5 w-2.5" />
                            <span>{t('Listen', { defaultValue: 'Listen' })}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isTyping && <TypingIndicator isAssistant={isAssistant} />}
          <div ref={messagesEndRef} />
        </div>

        {isAssistant && (
          <SymptomSummaryPanel summary={symptomSummary} t={t} />
        )}
      </div>

      <div className={cn(isAssistant ? 'assistant-chat-compose' : 'border-t border-default bg-card p-4')}>
        {escalationRequest && (
          <div className={isAssistant ? 'assistant-consent-panel' : 'mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950'}>
            <div className="flex items-start gap-2">
              <FaCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  Permission needed to forward this case
                </p>
                <p className="mt-1 text-xs leading-relaxed">
                  AI marked this as {escalationRequest.triageLabel || 'higher risk'} with score{' '}
                  {escalationRequest.riskScore}/100. Share your symptom summary with your{' '}
                  {escalationRequest.target || 'health worker'}?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEscalationConsent(true)}
                    disabled={isSubmittingConsent}
                    className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                  >
                    Yes, forward
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEscalationConsent(false)}
                    disabled={isSubmittingConsent}
                    className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {debugSymptomsEnabled && lastDetectedSymptoms.length > 0 && (
          <p className="mb-2 text-xs text-muted-fg">
            Detected symptoms: {lastDetectedSymptoms.join(', ')}
          </p>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {quickReplies.slice(0, 6).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSend(item)}
              disabled={isTyping}
              className={isAssistant ? 'assistant-chat-chip' : 'rounded-full border border-default px-3 py-1 text-xs text-fg-secondary transition hover:bg-hover'}
            >
              {item}
            </button>
          ))}
        </div>
        <div className={cn('flex gap-2', isAssistant && 'assistant-chat-input-row')}>
          {isAssistant && (
            <button type="button" className="assistant-chat-attach" aria-label="Attach" tabIndex={-1}>
              <FaPaperclip className="h-4 w-4 text-muted-fg" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsVoiceOpen(true);
              if (!isListening) startListening();
            }}
            className={cn(
              isAssistant
                ? 'assistant-chat-mic'
                : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-default bg-card-secondary text-teal-600 hover:border-teal-400 hover:bg-teal-50 dark:text-teal-400',
              isListening &&
                (isAssistant
                  ? 'assistant-chat-mic--active'
                  : 'border-rose-400 bg-rose-50 text-rose-600 animate-pulse')
            )}
            title={t('Voice Chat', { defaultValue: 'Voice Chat' })}
            aria-label="Open voice chat"
          >
            <FaMicrophone className="h-4 w-4" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={sessionId ? t('Type your message...') : t('Tap New Chat to begin...')}
            className={cn(
              'flex-1 text-sm text-fg placeholder:text-muted-fg focus:outline-none',
              isAssistant ? 'assistant-chat-input' : 'input-field !rounded-full'
            )}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isTyping}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-50',
              isAssistant ? 'assistant-chat-send h-10 w-10' : 'h-9 w-9 bg-brand-600 hover:bg-brand-700'
            )}
            aria-label="Send message"
          >
            <FaPaperPlane className={isAssistant ? 'h-3.5 w-3.5' : undefined} />
          </button>
        </div>
        {isAssistant && (
          <p className="assistant-chat-disclaimer">
            {t('This assistant provides general guidance only. Please consult a doctor for serious symptoms.')}
          </p>
        )}
      </div>

      <VoiceChatOverlay
        isOpen={isVoiceOpen}
        onClose={() => {
          setIsVoiceOpen(false);
          stopListening();
        }}
        selectedLanguage={selectedLanguage}
        onLanguageChange={(newLang) => {
          setSelectedLanguage(newLang);
        }}
        isListening={isListening}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        volumeLevel={volumeLevel}
        transcript={transcript}
        interimTranscript={interimTranscript}
        error={voiceError}
        onStartListening={startListening}
        onStopListening={stopListening}
        onClearTranscript={clearTranscript}
        onEditTranscript={(newText) => setTranscript(newText)}
        onSendTranscript={(text) => {
          setIsVoiceOpen(false);
          handleSend(text);
          clearTranscript();
        }}
        autoSendEnabled={autoSendEnabled}
        onToggleAutoSend={setAutoSendEnabled}
        t={t}
      />
    </div>
  );

  const deleteModal = deleteConfirm ? (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-default bg-card p-5 shadow-xl">
        <h3 className="text-base font-semibold text-fg">Delete chat?</h3>
        <p className="mt-2 text-sm text-muted-fg">
          This will delete this chat and all messages inside it.
        </p>
        <p className="mt-2 line-clamp-2 text-xs text-fg-secondary">
          {deleteConfirm.session_title || deleteConfirm.first_user_message || 'Health Chat'}
        </p>
        {deleteError ? <p className="mt-3 text-sm text-red-500">{deleteError}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDeleteSession}
            disabled={deletingSessionId === deleteConfirm.id}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {deletingSessionId === deleteConfirm.id ? 'Deleting...' : 'Delete chat'}
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm(null)}
            className="rounded-lg border border-default px-3 py-2 text-sm font-semibold text-fg transition hover:bg-hover"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (isAssistant) {
    return (
      <div className="assistant-chat">
        {sidebar}
        {messageArea}
        {deleteModal}
      </div>
    );
  }

  return (
    <div className="relative flex h-full overflow-hidden rounded-xl bg-card">
      <div
        className={`absolute z-30 h-full w-64 transform border-r border-default bg-sidebar transition-transform duration-200 md:static md:z-auto ${
          showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {sidebar}
      </div>
      {messageArea}
      {deleteModal}
    </div>
  );
}

export default Chatbot;
