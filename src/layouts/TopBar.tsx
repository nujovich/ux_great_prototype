import { RoleSwitcher } from '../components/shared/RoleSwitcher';
import { useRoleStore } from '../store/roleStore';
import { ENGINEERS } from '../fixtures/engineers';

export function TopBar() {
  const { currentRole, activeEngineerId } = useRoleStore();
  const engineer = ENGINEERS.find((e) => e.id === activeEngineerId);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          PROTOTIPO
        </span>
        <span className="text-sm text-slate-600">
          Rol activo: <strong>{currentRole}</strong>
          {currentRole === 'Engineer' && engineer && (
            <span className="text-slate-400"> · {engineer.name}</span>
          )}
        </span>
      </div>
      <RoleSwitcher />
    </header>
  );
}
