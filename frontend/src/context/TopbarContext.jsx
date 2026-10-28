import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const defaultMeta = {
  title: '',
  subtitle: '',
  breadcrumbs: [],
  notificationCount: 0,
};

const TopbarContext = createContext(null);

export function TopbarProvider({ children }) {
  const [meta, setMeta] = useState(defaultMeta);

  const setTopbarMeta = useCallback((patch) => {
    setMeta((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetTopbarMeta = useCallback(() => setMeta(defaultMeta), []);

  const value = useMemo(
    () => ({ meta, setTopbarMeta, resetTopbarMeta }),
    [meta, setTopbarMeta, resetTopbarMeta]
  );

  return <TopbarContext.Provider value={value}>{children}</TopbarContext.Provider>;
}

export function useTopbar() {
  const ctx = useContext(TopbarContext);
  if (!ctx) {
    return { meta: defaultMeta, setTopbarMeta: () => {}, resetTopbarMeta: () => {} };
  }
  return ctx;
}
