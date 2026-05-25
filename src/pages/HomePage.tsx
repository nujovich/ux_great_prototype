import { Link } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { NAV_ITEMS } from '../lib/permissions';
import { ROLES, ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from '../fixtures/roles';

export function HomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">GREAT System — UX Prototype</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Prototipo clickeable de las 6 vistas principales del sistema GREAT. Usá el selector
          de rol en la barra superior para ver cómo cambian las vistas y los permisos.
          Los datos viven en memoria y se resetean al recargar.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Vistas</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {NAV_ITEMS.map((item) => {
            const rolesWith = ROLES.filter((r) => ROLE_PERMISSIONS[r].includes(item.permission));
            return (
              <Link
                key={item.key}
                to={item.path}
                className="group rounded-lg border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{item.label}</span>
                  <ArrowRight size={16} className="text-slate-400 group-hover:text-brand-600" />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {rolesWith.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Matriz de roles
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Vista</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-4 py-2 text-center font-medium">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NAV_ITEMS.map((item) => (
                <tr key={item.key} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-700">{item.label}</td>
                  {ROLES.map((r) => {
                    const allowed = ROLE_PERMISSIONS[r].includes(item.permission);
                    return (
                      <td key={r} className="px-4 py-2 text-center">
                        {allowed ? (
                          <Check size={16} className="mx-auto text-emerald-600" />
                        ) : (
                          <X size={16} className="mx-auto text-slate-300" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
          {ROLES.map((r) => (
            <div key={r} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-800">{r}</div>
              <div className="text-xs text-slate-500">{ROLE_DESCRIPTIONS[r]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Flujos clickeables
        </h2>
        <ul className="space-y-1.5 text-sm text-slate-700">
          <li>
            <strong>Estimate → Draft → Definitive:</strong> entrá a Pre-Estimation como Engineer,
            abrí una línea sin estimar, completá y guardá como borrador. Luego promovela.
          </li>
          <li>
            <strong>Rejection rework:</strong> cambiá a CPO en Estimation Review, rechazá una
            línea estimada con comentario. Volvé a Engineer, la verás con el comentario en rojo.
          </li>
          <li>
            <strong>Multi-line selection:</strong> seleccioná varias líneas en Pre-Estimation
            (como PMO). Si mezclás métiers, aparece el banner de incompatibilidad.
          </li>
          <li>
            <strong>Copy estimation:</strong> abrí una línea con estimación cargada y clickeá
            "Copiar a otras líneas".
          </li>
        </ul>
      </section>
    </div>
  );
}
