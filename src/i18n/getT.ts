import type { Lang } from './types';
import { es } from './es';
import { en } from './en';

export function getT(lang: Lang) {
  const translations = lang === 'en' ? en : es;
  return function t(path: string, vars?: Record<string, string | number>): string {
    const keys = path.split('.');
    let cur: unknown = translations;
    for (const k of keys) {
      if (cur == null || typeof cur !== 'object') return path;
      cur = (cur as Record<string, unknown>)[k];
    }
    let result = typeof cur === 'string' ? cur : path;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return result;
  };
}
