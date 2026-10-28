import { createContext, useCallback, useContext, useRef } from 'react';

const ScanContext = createContext(null);

export function ScanProvider({ children }) {
  const handlerRef = useRef(null);

  const registerScanHandler = useCallback((handler) => {
    handlerRef.current = handler;
  }, []);

  const requestScan = useCallback(() => {
    handlerRef.current?.();
  }, []);

  return (
    <ScanContext.Provider value={{ registerScanHandler, requestScan }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) {
    return { registerScanHandler: () => {}, requestScan: () => {} };
  }
  return ctx;
}
