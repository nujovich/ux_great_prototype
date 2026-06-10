import { Link } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { NAV_ITEMS } from '../lib/permissions';
import { ROLES, ROLE_PERMISSIONS } from '../fixtures/roles';
import { useT } from '../i18n/useT';

export function HomePage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">GREAT System — UX Prototype</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('home.subtitle')}</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">{t('home.views')}</h2>
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
                    <span key={r} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{r}</span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t('home.rolesMatrix')}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left font-medium">{t('home.view')}</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-4 py-2 text-center font-medium">{r}</th>
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
                        {allowed ? <Check size={16} className="mx-auto text-emerald-600" /> : <X size={16} className="mx-auto text-slate-300" />}
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
              <div className="text-xs text-slate-500">{t(`roleDesc.${r}`)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {t('home.flows')}
        </h2>
        <ul className="space-y-1.5 text-sm text-slate-700">
          <li><strong>Estimate → Draft → Definitive:</strong> {t('home.flow1')}</li>
          <li><strong>Rejection rework:</strong> {t('home.flow2')}</li>
          <li><strong>Multi-line selection:</strong> {t('home.flow3')}</li>
          <li><strong>Copy estimation:</strong> {t('home.flow4')}</li>
        </ul>
      </section>
    </div>
  );
}
