import { UserCog } from 'lucide-react';
import { useRoleStore } from '../../store/roleStore';
import { ROLES } from '../../fixtures/roles';
import { useT } from '../../i18n/useT';
import type { Role } from '../../types';

export function RoleSwitcher() {
  const { currentRole, setRole } = useRoleStore();
  const t = useT();
  return (
    <div className="flex items-center gap-2" title="Solo visible en prototipo">
      <UserCog size={16} className="text-slate-500" />
      <label className="text-xs font-medium text-slate-500">{t('topBar.viewAs')}</label>
      <select
        value={currentRole}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700 focus:border-brand-500 focus:outline-none"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <span className="hidden text-xs text-slate-400 md:inline">— {t(`roleDesc.${currentRole}`)}</span>
    </div>
  );
}
