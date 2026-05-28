import { useLangContext } from './LangContext';
import { getT } from './getT';

export function useT() {
  const { lang } = useLangContext();
  return getT(lang);
}
