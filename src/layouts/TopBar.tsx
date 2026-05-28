import { useRoleStore } from '../store/roleStore';
import { useLangContext } from '../i18n/LangContext';
import { useT } from '../i18n/useT';
import { RoleSwitcher } from '../components/shared/RoleSwitcher';
import { ENGINEERS } from '../fixtures/engineers';

export function TopBar() {
  const { currentRole, activeEngineerId } = useRoleStore();
  const { lang, toggleLang } = useLangContext();
  const t = useT();
  const engineer = ENGINEERS.find((e) => e.id === activeEngineerId);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          {t('topBar.prototypeBadge')}
        </span>
        <span className="text-sm text-slate-600">
          {t('topBar.roleActive')}: <strong>{currentRole}</strong>
          {currentRole === 'Engineer' && engineer && (
            <span className="text-slate-400"> · {engineer.name}</span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLang}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {lang === 'es' ? 'EN' : 'ES'}
        </button>
        <RoleSwitcher />
      </div>
    </header>
  );
}
