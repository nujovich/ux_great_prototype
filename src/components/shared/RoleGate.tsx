import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useRoleStore } from '../../store/roleStore';
import { useT } from '../../i18n/useT';
import type { Permission } from '../../fixtures/roles';

interface Props {
  permission: Permission;
  fallbackPermission?: Permission;
  children: ReactNode;
}

export function RoleGate({ permission, fallbackPermission, children }: Props) {
  const can = useRoleStore((s) => s.can(permission));
  const canFallback = useRoleStore((s) => fallbackPermission ? s.can(fallbackPermission) : false);
  const role = useRoleStore((s) => s.currentRole);
  const t = useT();
  if (!can && !canFallback) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">{t('roleGate.title')}</h3>
            <p className="mt-1 text-sm text-amber-800">
              {t('roleGate.body', { role, perm: permission })}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
