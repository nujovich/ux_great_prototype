import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useRoleStore } from '../../store/roleStore';
import type { Permission } from '../../fixtures/roles';

interface Props {
  permission: Permission;
  children: ReactNode;
}

export function RoleGate({ permission, children }: Props) {
  const can = useRoleStore((s) => s.can(permission));
  const role = useRoleStore((s) => s.currentRole);
  if (!can) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">Acceso restringido</h3>
            <p className="mt-1 text-sm text-amber-800">
              El rol <strong>{role}</strong> no tiene permiso para ver esta vista
              (<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">{permission}</code>).
              Cambiá de rol desde el switcher arriba a la derecha.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
