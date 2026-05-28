import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Lang } from './types';

const STORAGE_KEY = 'great-lang';

interface LangContextValue {
  lang: Lang;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextValue>({
  lang: 'es',
  toggleLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'es';
  });

  function toggleLang() {
    const next: Lang = lang === 'es' ? 'en' : 'es';
    setLang(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <LangContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLangContext() {
  return useContext(LangContext);
}
