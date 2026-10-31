import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const PREF_KEY = 'skybridge.prefs';
const KEY_STORE = 'skybridge.operatorKey';
const DEFAULT_PREFS = { mode: 'demo', theme: 'system', operatorName: '' };

function loadPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') };
  } catch {
    return DEFAULT_PREFS;
  }
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [prefs, setPrefs] = useState(loadPrefs);
  // The operator key is kept for this browser session only.
  const [operatorKey, setOperatorKeyState] = useState(() => sessionStorage.getItem(KEY_STORE) || '');

  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && prefersDark.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    if (prefs.theme !== 'system') return undefined;
    prefersDark.addEventListener('change', apply);
    return () => prefersDark.removeEventListener('change', apply);
  }, [prefs.theme]);

  const update = useCallback((patch) => setPrefs((p) => ({ ...p, ...patch })), []);

  const setOperatorKey = useCallback((key) => {
    setOperatorKeyState(key);
    if (key) sessionStorage.setItem(KEY_STORE, key);
    else sessionStorage.removeItem(KEY_STORE);
  }, []);

  const value = useMemo(
    () => ({ ...prefs, operatorKey, update, setOperatorKey }),
    [prefs, operatorKey, update, setOperatorKey],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
