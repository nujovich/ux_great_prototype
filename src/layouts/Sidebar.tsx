import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home,
  ClipboardList,
  CheckSquare,
  Users,
  FileBarChart,
  CalendarRange,
  Settings,
} from 'lucide-react';
import { useRoleStore } from '../store/roleStore';
import { visibleNavFor } from '../lib/permissions';

const icons: Record<string, ReactElement> = {
  'pre-estimation': <ClipboardList size={16} />,
  'estimation-review': <CheckSquare size={16} />,
  allocation: <Users size={16} />,
  'final-review': <FileBarChart size={16} />,
  management: <CalendarRange size={16} />,
  admin: <Settings size={16} />,
};

export function Sidebar() {
  const role = useRoleStore((s) => s.currentRole);
  const items = visibleNavFor(role);
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-4">
        <div className="text-sm font-bold tracking-tight text-slate-900">GREAT System</div>
        <div className="text-xs text-slate-500">UX Prototype</div>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
              isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
            )
          }
        >
          <Home size={16} /> Inicio
        </NavLink>
        <div className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Vistas
        </div>
        {items.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
              )
            }
          >
            {icons[item.key]} {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-400">
        Datos en memoria · reset al recargar
      </div>
    </aside>
  );
}
