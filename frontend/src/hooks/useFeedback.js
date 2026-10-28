import { useCallback, useRef, useState } from 'react';

/**
 * Lightweight page-level feedback (success / error / info).
 * Auto-clears after `durationMs` unless a new message is set.
 */
export function useFeedback(durationMs = 3500) {
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('info'); // success | error | info
  const timerRef = useRef(null);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage('');
  }, []);

  const notify = useCallback(
    (text, type = 'success') => {
      if (!text) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setVariant(type);
      setMessage(text);
      timerRef.current = setTimeout(() => {
        setMessage('');
        timerRef.current = null;
      }, durationMs);
    },
    [durationMs]
  );

  const notifySuccess = useCallback((text) => notify(text, 'success'), [notify]);
  const notifyError = useCallback((text) => notify(text, 'error'), [notify]);
  const notifyInfo = useCallback((text) => notify(text, 'info'), [notify]);

  return {
    message,
    variant,
    notify,
    notifySuccess,
    notifyError,
    notifyInfo,
    clear,
    hasMessage: Boolean(message),
  };
}
