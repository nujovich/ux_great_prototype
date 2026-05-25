import { UserCog } from 'lucide-react';
import { useRoleStore } from '../../store/roleStore';
import { ROLES, ROLE_DESCRIPTIONS } from '../../fixtures/roles';

export function RoleSwitcher() {
  const { currentRole, setRole } = useRoleStore();
  return (
    <div className="flex items-center gap-2" title="Solo visible en prototipo">
      <UserCog size={16} className="text-slate-500" />
      <label className="text-xs font-medium text-slate-500">Ver como</label>
      <select
        value={currentRole}
        onChange={(e) => setRole(e.target.value as typeof currentRole)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700 focus:border-brand-500 focus:outline-none"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <span className="hidden text-xs text-slate-400 md:inline">— {ROLE_DESCRIPTIONS[currentRole]}</span>
    </div>
  );
}
