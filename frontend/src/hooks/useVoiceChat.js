import { useState, useEffect, useRef, useCallback } from 'react';

export const LANGUAGE_CODE_MAP = {
  Marathi: 'mr-IN',
  Hindi: 'hi-IN',
  English: 'en-IN',
};

/**
 * Clean markdown, emojis, JSON, and formatting symbols that garble Text-to-Speech engines.
 */
export function cleanTextForSpeech(rawText) {
  if (!rawText) return '';
  return String(rawText)
    // Remove JSON objects or arrays
    .replace(/\{[\s\S]*?\}/g, '')
    // Remove markdown code blocks and inline backticks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`.*?`/g, '')
    // Remove headers, bold, italics, strikethrough
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_~]/g, '')
    .replace(/>\s+/g, '')
    // Remove URLs
    .replace(/https?:\/\/\S+/gi, '')
    // Remove list bullets and numbers at start of lines
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove severity & triage label lines
    .replace(/severity\s*(level)?\s*:\s*\w+/gi, '')
    .replace(/risk\s*level\s*:\s*\w+/gi, '')
    .replace(/triage\s*:\s*\w+/gi, '')
    // Remove emojis that TTS engines read out phonetically
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    // Replace multiple newlines with a period pause
    .replace(/\n+/g, '. ')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intelligent voice selector for Indian regional languages:
 * - Marathi: Searches for mr-IN/mr. If absent, falls back to Hindi (hi-IN) Devanagari voice.
 *   NEVER uses English voices for Marathi!
 * - Hindi: Searches for hi-IN/hi. NEVER uses English voices for Hindi!
 * - English: Prefers en-IN, falls back to other en voices. NEVER uses Hindi/Marathi voices.
 */
export function selectBestVoice(voices, targetLang) {
  if (!voices || voices.length === 0) return null;

  const target = String(targetLang || '').toLowerCase();
  const isMarathi = target.startsWith('mar') || target === 'mr';
  const isHindi = target.startsWith('hin') || target === 'hi';

  if (isMarathi) {
    // 1. Dedicated Marathi voice
    const mrVoice = voices.find(
      (v) =>
        v.lang?.toLowerCase().replace('_', '-').startsWith('mr') ||
        v.name?.toLowerCase().includes('marathi')
    );
    if (mrVoice) return mrVoice;

    // 2. Hindi fallback for Marathi (Devanagari script phonetic fidelity)
    const hiVoice = voices.find(
      (v) =>
        v.lang?.toLowerCase().replace('_', '-').startsWith('hi') ||
        v.name?.toLowerCase().includes('hindi') ||
        v.name?.toLowerCase().includes('kalpana') ||
        v.name?.toLowerCase().includes('madhur') ||
        v.name?.toLowerCase().includes('swara') ||
        v.name?.toLowerCase().includes('neerja')
    );
    if (hiVoice) return hiVoice;

    // 3. Do NOT pick an English voice for Marathi!
    return null;
  }

  if (isHindi) {
    // 1. Dedicated Hindi voice
    const hiVoice = voices.find(
      (v) =>
        v.lang?.toLowerCase().replace('_', '-').startsWith('hi') ||
        v.name?.toLowerCase().includes('hindi') ||
        v.name?.toLowerCase().includes('kalpana') ||
        v.name?.toLowerCase().includes('madhur') ||
        v.name?.toLowerCase().includes('swara') ||
        v.name?.toLowerCase().includes('neerja')
    );
    if (hiVoice) return hiVoice;

    // Do NOT pick an English voice for Hindi!
    return null;
  }

  // English:
  // 1. Indian English voice
  const enInVoice = voices.find(
    (v) =>
      v.lang?.toLowerCase().replace('_', '-') === 'en-in' ||
      (v.lang?.toLowerCase().startsWith('en') && v.name?.toLowerCase().includes('india'))
  );
  if (enInVoice) return enInVoice;

  // 2. Any English voice
  const enVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('en'));
  if (enVoice) return enVoice;

  return null;
}

export function useVoiceChat({
  language = 'English',
  onAutoSend = null,
  autoSendEnabled = false,
} = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [error, setError] = useState(null); // 'permission-denied' | 'not-supported' | 'no-speech' | 'network' | string
  const [voices, setVoices] = useState([]);

  // Sound toggle state (defaults to true; persisted in localStorage)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('rha_sound_enabled');
      return stored === null ? true : stored !== 'false';
    } catch {
      return true;
    }
  });

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const autoSendTimeoutRef = useRef(null);
  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);
  const currentUtterancesRef = useRef([]);
  const playbackSessionIdRef = useRef(0);
  const chunkTimeoutRef = useRef(null);

  const langCode = LANGUAGE_CODE_MAP[language] || 'en-IN';

  // Check Web Speech API support and load available voices
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    setIsSupported(Boolean(SpeechRecognition));

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        const loaded = window.speechSynthesis.getVoices() || [];
        setVoices(loaded);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
      return () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      };
    }
  }, []);

  // Stop speech synthesis cleanly and cancel any queued chunks/timeouts
  const stopSpeaking = useCallback(() => {
    // 1. Invalidate active playback session token
    playbackSessionIdRef.current += 1;

    // 2. Clear any pending chunk transition timeout
    if (chunkTimeoutRef.current) {
      clearTimeout(chunkTimeoutRef.current);
      chunkTimeoutRef.current = null;
    }

    // 3. Remove all listeners from tracked utterances before cancelling
    // to prevent browsers from firing interrupted/canceled error events
    // that could accidentally trigger subsequent chunks
    if (currentUtterancesRef.current && currentUtterancesRef.current.length > 0) {
      currentUtterancesRef.current.forEach((u) => {
        try {
          u.onend = null;
          u.onerror = null;
          u.onstart = null;
          u.onpause = null;
          u.onresume = null;
        } catch {
          // ignore
        }
      });
      currentUtterancesRef.current = [];
    }

    // 4. Cancel active SpeechSynthesis in browser
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('speechSynthesis.cancel error:', e);
      }
    }

    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, []);

  // Sync soundEnabled to localStorage
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('rha_sound_enabled', String(next));
      } catch {
        // ignore
      }
      if (!next) {
        stopSpeaking();
      }
      return next;
    });
  }, [stopSpeaking]);

  // Audio level analyzer
  const startAudioAnalysis = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setVolumeLevel(normalized);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (err) {
      console.warn('Audio visualization not available:', err);
    }
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVolumeLevel(0);
  };

  // Speak assistant response in chunks with cancellation tracking
  const speak = useCallback(
    (text, forcedLanguage = null, messageId = null) => {
      // Immediately stop any prior playback and get a brand new session token
      stopSpeaking();

      if (!soundEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
        return;
      }

      const clean = cleanTextForSpeech(text);
      if (!clean) return;

      // Capture the current playback session token
      const currentSessionId = playbackSessionIdRef.current;

      const targetLang = forcedLanguage || language;
      const targetLangCode = LANGUAGE_CODE_MAP[targetLang] || 'en-IN';

      const loadedVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices() || [];
      const bestVoice = selectBestVoice(loadedVoices, targetLang);

      // Split into sentences so long messages don't timeout or buffer-overflow
      const rawSentences = clean.match(/[^.!?।\n]+[.!?।\n]*/g) || [clean];
      const chunks = rawSentences.map((s) => s.trim()).filter(Boolean);

      if (chunks.length === 0) return;

      setIsSpeaking(true);
      if (messageId) setSpeakingMessageId(messageId);

      let chunkIndex = 0;

      const speakNextChunk = () => {
        // Validation check: if session changed or sound disabled or finished
        if (playbackSessionIdRef.current !== currentSessionId) {
          return;
        }

        if (!soundEnabled || chunkIndex >= chunks.length) {
          if (playbackSessionIdRef.current === currentSessionId) {
            setIsSpeaking(false);
            setSpeakingMessageId(null);
            currentUtterancesRef.current = [];
          }
          return;
        }

        const chunkText = chunks[chunkIndex];
        chunkIndex++;

        const utterance = new SpeechSynthesisUtterance(chunkText);
        utterance.lang = targetLangCode;
        if (bestVoice) {
          utterance.voice = bestVoice;
        }

        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        utterance.onend = () => {
          if (playbackSessionIdRef.current !== currentSessionId) return;
          chunkTimeoutRef.current = setTimeout(() => {
            if (playbackSessionIdRef.current === currentSessionId) {
              speakNextChunk();
            }
          }, 30);
        };

        utterance.onerror = (e) => {
          // If interrupted or canceled, or session token no longer matches, do NOT continue
          if (
            playbackSessionIdRef.current !== currentSessionId ||
            e.error === 'canceled' ||
            e.error === 'interrupted'
          ) {
            return;
          }
          console.warn('Speech synthesis chunk error:', e.error);
          chunkTimeoutRef.current = setTimeout(() => {
            if (playbackSessionIdRef.current === currentSessionId) {
              speakNextChunk();
            }
          }, 30);
        };

        currentUtterancesRef.current = [utterance];
        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn('speechSynthesis.speak error:', err);
          if (playbackSessionIdRef.current === currentSessionId) {
            setIsSpeaking(false);
            setSpeakingMessageId(null);
          }
        }
      };

      speakNextChunk();
    },
    [soundEnabled, language, voices, stopSpeaking]
  );

  // Stop listening
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    isStartingRef.current = false;
    setIsListening(false);
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    stopAudioAnalysis();
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setError('not-supported');
      return;
    }

    if (isStartingRef.current || isListeningRef.current) {
      return;
    }

    // Stop speaking if assistant is currently talking
    stopSpeaking();
    setError(null);
    isStartingRef.current = true;

    // Clean up existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = langCode;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isStartingRef.current = false;
        isListeningRef.current = true;
        setIsListening(true);
        setError(null);
        startAudioAnalysis();
      };

      recognition.onresult = (event) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalChunk += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        if (finalChunk) {
          setTranscript((prev) => {
            const next = prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim();

            if (autoSendEnabled && onAutoSend && next.trim().length > 3) {
              if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
              autoSendTimeoutRef.current = setTimeout(() => {
                onAutoSend(next.trim());
                setTranscript('');
                setInterimTranscript('');
                stopListening();
              }, 2200);
            }

            return next;
          });
        }

        setInterimTranscript(interim);
      };

      recognition.onerror = (event) => {
        isStartingRef.current = false;
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('permission-denied');
          stopListening();
        } else if (event.error === 'no-speech') {
          // ignore momentary silence
        } else if (event.error === 'network') {
          setError('network');
        } else {
          setError(event.error);
        }
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            isListeningRef.current = false;
            setIsListening(false);
            stopAudioAnalysis();
          }
        } else {
          setIsListening(false);
          stopAudioAnalysis();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      isStartingRef.current = false;
      console.error('Failed to start speech recognition:', err);
      if (err.name === 'NotAllowedError') {
        setError('permission-denied');
      } else {
        setError(err.message || 'error');
      }
      setIsListening(false);
      stopAudioAnalysis();
    }
  }, [langCode, autoSendEnabled, onAutoSend, stopListening, stopSpeaking]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    if (autoSendTimeoutRef.current) {
      clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = null;
    }
  }, []);

  // Restart recognition if language changes while listening
  useEffect(() => {
    if (isListening) {
      stopListening();
      const timer = setTimeout(() => {
        startListening();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup & interruption listeners for window/navigation lifecycle
  useEffect(() => {
    const handleStop = () => {
      stopSpeaking();
    };

    window.addEventListener('beforeunload', handleStop);
    window.addEventListener('pagehide', handleStop);
    window.addEventListener('popstate', handleStop);
    window.addEventListener('hashchange', handleStop);

    const handleVisibility = () => {
      if (document.hidden) {
        stopSpeaking();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleStop);
      window.removeEventListener('pagehide', handleStop);
      window.removeEventListener('popstate', handleStop);
      window.removeEventListener('hashchange', handleStop);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      isStartingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      stopAudioAnalysis();
      stopSpeaking();
      if (autoSendTimeoutRef.current) {
        clearTimeout(autoSendTimeoutRef.current);
      }
    };
  }, [stopSpeaking]);

  return {
    isSupported,
    isListening,
    isSpeaking,
    speakingMessageId,
    soundEnabled,
    transcript,
    interimTranscript,
    volumeLevel,
    error,
    startListening,
    stopListening,
    clearTranscript,
    setTranscript,
    speak,
    stopSpeaking,
    toggleSound,
  };
}
