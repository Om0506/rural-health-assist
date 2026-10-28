import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaMicrophone,
  FaPaperPlane,
  FaTimes,
  FaTrash,
  FaEdit,
  FaCheck,
  FaStop,
  FaMagic,
  FaExclamationTriangle,
  FaRedo,
  FaVolumeUp,
  FaVolumeMute,
} from 'react-icons/fa';
import { cn } from '../../utils/cn';

const LANGUAGE_CONFIG = [
  {
    key: 'Marathi',
    code: 'mr',
    label: 'मराठी',
    sub: 'Marathi',
    sample: 'उदा. मला २ दिवसांपासून ताप आणि खोकला आहे...',
  },
  {
    key: 'Hindi',
    code: 'hi',
    label: 'हिन्दी',
    sub: 'Hindi',
    sample: 'उदा. मुझे कल से तेज सिरदर्द और कमजोरी महसूस हो रही है...',
  },
  {
    key: 'English',
    code: 'en',
    label: 'English',
    sub: 'English',
    sample: 'e.g. I have had fever and cough since yesterday...',
  },
];

export default function VoiceChatOverlay({
  isOpen,
  onClose,
  selectedLanguage,
  onLanguageChange,
  isListening,
  soundEnabled,
  onToggleSound,
  volumeLevel = 0,
  transcript = '',
  interimTranscript = '',
  error = null,
  onStartListening,
  onStopListening,
  onClearTranscript,
  onEditTranscript,
  onSendTranscript,
  onStopSpeaking,
  autoSendEnabled = false,
  onToggleAutoSend,
  t,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync editedText when transcript updates
  useEffect(() => {
    if (!isEditing) {
      setEditedText(transcript);
    }
  }, [transcript, isEditing]);

  // Reset submitting state when overlay opens
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentLangObj =
    LANGUAGE_CONFIG.find((l) => l.key === selectedLanguage) || LANGUAGE_CONFIG[2];

  const fullLiveText = [transcript, interimTranscript].filter(Boolean).join(' ');

  const handleStartEditing = () => {
    onStopSpeaking?.();
    onStopListening?.();
    setEditedText(fullLiveText);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onEditTranscript?.(editedText);
    setIsEditing(false);
  };

  const handleConfirmSend = () => {
    const textToSend = (isEditing ? editedText : fullLiveText).trim();
    if (!textToSend || isSubmitting) return;

    setIsSubmitting(true);
    setIsEditing(false);
    onStopSpeaking?.();
    onStopListening?.();

    // 1. Close voice overlay immediately to restore normal chat window
    onClose?.();

    // 2. Send transcript to chatbot flow
    onSendTranscript?.(textToSend);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-card/95 backdrop-blur-md dark:bg-slate-900/95"
      >
        {/* Top Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-default px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-cyan-500 text-white shadow-glow">
              <FaMagic className="h-4 w-4" />
              {isListening && (
                <span className="absolute -inset-0.5 animate-ping rounded-xl bg-teal-400 opacity-40" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-fg">
                  {t('Gemini Live Voice', { defaultValue: 'Gemini Live Voice' })}
                </h3>
                <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-600 dark:bg-teal-400/10 dark:text-teal-300">
                  AI Live
                </span>
              </div>
              <p className="text-[11px] text-muted-fg">
                {selectedLanguage === 'Marathi'
                  ? 'मराठी व्हॉइस असिस्टंट'
                  : selectedLanguage === 'Hindi'
                  ? 'हिन्दी वॉइस सहायक'
                  : 'Healthcare voice assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border border-default transition',
                soundEnabled
                  ? 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300'
                  : 'bg-card-secondary text-muted-fg hover:text-fg'
              )}
              title={soundEnabled ? t('Mute Assistant Voice', { defaultValue: 'Sound On' }) : t('Unmute Assistant Voice', { defaultValue: 'Sound Off' })}
              aria-label="Toggle sound"
            >
              {soundEnabled ? <FaVolumeUp className="h-4 w-4" /> : <FaVolumeMute className="h-4 w-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                onStopSpeaking?.();
                onStopListening?.();
                onClose?.();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-default bg-card-secondary text-muted-fg transition hover:bg-hover hover:text-fg"
              title={t('Cancel', { defaultValue: 'Cancel' })}
              aria-label="Close voice mode"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-lg flex-col items-center">
            {/* Language Selector Pills */}
            <div className="w-full">
              <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                {t('Choose Language', { defaultValue: 'Choose Language / भाषा निवडा / भाषा चुनें' })}
              </p>
              <div className="flex justify-center gap-2">
                {LANGUAGE_CONFIG.map((lang) => {
                  const isSelected = selectedLanguage === lang.key;
                  return (
                    <button
                      key={lang.key}
                      type="button"
                      onClick={() => {
                        onStopSpeaking?.();
                        onLanguageChange(lang.key);
                      }}
                      className={cn(
                        'flex flex-1 max-w-[130px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                        isSelected
                          ? 'border-teal-500 bg-teal-50 text-teal-800 shadow-sm dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-400'
                          : 'border-default bg-card text-muted-fg hover:border-brand-200 hover:text-fg'
                      )}
                    >
                      <span className="text-sm">{lang.label}</span>
                      <span className="text-[10px] opacity-70">({lang.code})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mt-3.5 w-full rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                <div className="flex items-start gap-2.5">
                  <FaExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <div className="flex-1">
                    <p className="font-semibold">
                      {error === 'permission-denied'
                        ? t('Microphone blocked', {
                            defaultValue:
                              'Microphone access is blocked. Please allow microphone permission in your browser address bar to speak.',
                          })
                        : error === 'not-supported'
                        ? t('Voice input not supported', {
                            defaultValue:
                              'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Android Chrome.',
                          })
                        : t('Voice error occurred. Please try again.', {
                            defaultValue: 'Audio input error. Please tap the mic and try again.',
                          })}
                    </p>
                    {error === 'permission-denied' && (
                      <button
                        type="button"
                        onClick={() => {
                          onStopSpeaking?.();
                          onStartListening?.();
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
                      >
                        <FaRedo className="h-3 w-3" />
                        {t('Try Again', { defaultValue: 'Try Again' })}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Gemini Live Orb & Waveform */}
            <div className="relative my-5 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                {isListening && (
                  <>
                    <motion.div
                      animate={{
                        scale: [1, 1.25 + volumeLevel / 150, 1],
                        opacity: [0.35, 0.65, 0.35],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.8,
                        ease: 'easeInOut',
                      }}
                      className="absolute h-36 w-36 rounded-full bg-gradient-to-tr from-teal-400 via-emerald-400 to-cyan-400 blur-xl"
                    />
                    <motion.div
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.2, 0.45, 0.2],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2.4,
                        ease: 'easeInOut',
                      }}
                      className="absolute h-48 w-48 rounded-full bg-teal-500/20 blur-2xl"
                    />
                  </>
                )}

                {/* Central Tactile Mic Button */}
                <button
                  type="button"
                  onClick={
                    isListening
                      ? onStopListening
                      : () => {
                          onStopSpeaking?.();
                          onStartListening?.();
                        }
                  }
                  className={cn(
                    'relative z-10 flex h-24 w-24 items-center justify-center rounded-full text-white shadow-2xl transition-transform active:scale-95',
                    isListening
                      ? 'bg-gradient-to-tr from-rose-500 to-red-600 ring-4 ring-rose-400/40 animate-pulse'
                      : 'bg-gradient-to-tr from-teal-600 via-emerald-600 to-brand-600 hover:scale-105 ring-4 ring-teal-500/20'
                  )}
                  aria-label={isListening ? 'Stop listening' : 'Start listening'}
                >
                  {isListening ? (
                    <FaStop className="h-8 w-8" />
                  ) : (
                    <FaMicrophone className="h-8 w-8" />
                  )}
                </button>
              </div>

              {/* Status Indicator */}
              <div className="mt-3.5 flex items-center gap-2">
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    isListening ? 'bg-red-500 animate-ping' : 'bg-emerald-500'
                  )}
                />
                <span className="text-xs font-semibold text-fg">
                  {isListening
                    ? t('Listening...', { defaultValue: 'Listening... (Speak now)' })
                    : t('Ready to listen', { defaultValue: 'Tap microphone to speak' })}
                </span>
              </div>

              {/* Live Waveform Bars */}
              <div className="mt-2.5 flex h-7 items-end gap-1.5" aria-hidden="true">
                {[1, 2, 3, 4, 5, 6, 7].map((bar, i) => {
                  const dynamicHeight = isListening
                    ? Math.max(15, Math.min(100, (volumeLevel || 10) * (0.8 + (i % 3) * 0.3)))
                    : 15;

                  return (
                    <motion.span
                      key={bar}
                      animate={{
                        height: isListening ? `${dynamicHeight}%` : '15%',
                      }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        'w-1.5 rounded-full',
                        isListening
                          ? 'bg-gradient-to-t from-red-500 to-rose-400'
                          : 'bg-default/60'
                      )}
                    />
                  );
                })}
              </div>

              <p className="mt-2 text-center text-xs text-muted-fg">
                {isListening
                  ? t('Speak clearly into your microphone...', {
                      defaultValue: 'Speak clearly into your microphone...',
                    })
                  : currentLangObj.sample}
              </p>
            </div>

            {/* Live Transcript Preview Box */}
            <div className="w-full rounded-2xl border border-default bg-card p-4 shadow-sm dark:bg-slate-800/60">
              <div className="mb-2 flex items-center justify-between border-b border-default pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-fg">
                  {t('Live Transcript', { defaultValue: 'Live Transcript' })}
                </span>
                <div className="flex items-center gap-2">
                  {fullLiveText && !isEditing && (
                    <button
                      type="button"
                      onClick={handleStartEditing}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      <FaEdit className="h-3 w-3" />
                      {t('Edit', { defaultValue: 'Edit' })}
                    </button>
                  )}
                  {fullLiveText && (
                    <button
                      type="button"
                      onClick={onClearTranscript}
                      className="inline-flex items-center gap-1 text-xs text-muted-fg hover:text-red-500"
                      title={t('Clear', { defaultValue: 'Clear' })}
                    >
                      <FaTrash className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-default bg-card-secondary p-3 text-sm text-fg focus:border-brand-500 focus:outline-none"
                    placeholder="Type or correct your symptoms..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg border border-default px-3 py-1.5 text-xs font-semibold text-fg-secondary hover:bg-hover"
                    >
                      {t('Cancel', { defaultValue: 'Cancel' })}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                    >
                      <FaCheck className="h-3 w-3" />
                      {t('Save', { defaultValue: 'Save' })}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="min-h-[64px]">
                  {fullLiveText ? (
                    <p className="text-sm font-medium leading-relaxed text-fg">
                      {transcript}
                      {interimTranscript && (
                        <span className="italic text-teal-600 dark:text-teal-400">
                          {' '}
                          {interimTranscript}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs italic text-muted-fg">
                      {isListening
                        ? t('Listening... Spoken words will appear here in real time.', {
                            defaultValue: 'Listening... Spoken words will appear here in real time.',
                          })
                        : t('Tap mic and speak your symptoms in Marathi, Hindi, or English...', {
                            defaultValue: 'Tap mic and speak your symptoms in Marathi, Hindi, or English...',
                          })}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons: Auto-send & Send Button */}
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-default/70 pt-3">
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-fg">
                  <input
                    type="checkbox"
                    checked={autoSendEnabled}
                    onChange={(e) => onToggleAutoSend?.(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-default text-teal-600 focus:ring-teal-500"
                  />
                  <span>{t('Auto-send on pause', { defaultValue: 'Auto-send when paused' })}</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onStopSpeaking?.();
                      onStopListening?.();
                      onClose?.();
                    }}
                    className="rounded-xl border border-default px-3 py-2 text-xs font-semibold text-fg-secondary hover:bg-hover"
                  >
                    {t('Cancel', { defaultValue: 'Cancel' })}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSend}
                    disabled={!fullLiveText.trim() || isSubmitting}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:from-teal-700 hover:to-emerald-700 disabled:opacity-40"
                  >
                    <FaPaperPlane className="h-3.5 w-3.5" />
                    <span>{t('Confirm & Send', { defaultValue: 'Send Message' })}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
