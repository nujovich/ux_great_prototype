import { useState } from 'react';
import { Upload, Plus, Trash2, CalendarPlus, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { RoleGate } from '../components/shared/RoleGate';
import { useRoleStore } from '../store/roleStore';
import { Button } from '../components/shared/Button';
import { WORKLOAD_STANDARDS, PROTOTYPE_CATEGORIES, ALLOCATION_RULES } from '../fixtures/admin';
import { K_EURO_RATES } from '../fixtures/cycles';
import { useDataStore } from '../store/dataStore';
import { useUIStore } from '../store/uiStore';
import { useT } from '../i18n/useT';
import { formatDate } from '../lib/format';
import type { Metier } from '../types';

type Tab = 'workload' | 'categories' | 'rules' | 'rates' | 'cycles';

export function AdminPage() {
  return (
    <RoleGate permission="view:admin" fallbackPermission="upload:workload-standards">
      <AdminContent />
    </RoleGate>
  );
}

function AdminContent() {
  const [tab, setTab] = useState<Tab>('workload');
  const can = useRoleStore((s) => s.can);
  const t = useT();
  const allTabs: { key: Tab; label: string; requiresAdmin?: boolean }[] = [
    { key: 'workload',    label: t('admin.tabWorkload') },
    { key: 'categories',  label: t('admin.tabCategories'),  requiresAdmin: true },
    { key: 'rules',       label: t('admin.tabRules'),        requiresAdmin: true },
    { key: 'rates',       label: t('admin.tabRates'),        requiresAdmin: true },
    { key: 'cycles',      label: t('admin.tabCycles'),       requiresAdmin: true },
  ];
  const tabs = allTabs.filter((tb) => !tb.requiresAdmin || can('view:admin'));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t('admin.title')}</h1>
        <p className="text-sm text-slate-600">{t('admin.subtitle')}</p>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={clsx(
              'rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === tb.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>
      {tab === 'workload' && <WorkloadStandardsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'rates' && <RatesTab />}
      {tab === 'cycles' && <CyclesTab />}
    </div>
  );
}

function WorkloadStandardsTab() {
  const [items, setItems] = useState(WORKLOAD_STANDARDS);
  const [metier, setMetier] = useState<Metier>('H-DESIGN');
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  function handleUpload() {
    const id = `ws-${Date.now()}`;
    setItems((i) => [
      { id, metier, fileName: `${metier.toLowerCase()}-uploaded-${Date.now()}.xlsx`, uploadedAt: new Date().toISOString(), rowCount: 100 },
      ...i,
    ]);
    pushToast(`Archivo cargado para métier ${metier}`, 'success');
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-semibold text-slate-800">{t('admin.workloadUpload')}</h3>
        <div className="flex items-end gap-2">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500">{t('admin.workloadMetier')}</label>
            <select
              value={metier}
              onChange={(e) => setMetier(e.target.value as Metier)}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              {(['H-DESIGN', 'H-TUNING', 'H-SOFTWARE', 'H-CUSTOMER', 'H-PROJECT', 'H-NP', 'H-TESTING'] as Metier[]).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <Button onClick={handleUpload}>
            <Upload size={14} /> {t('admin.workloadBtn')}
          </Button>
        </div>
      </div>
      <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{t('admin.workloadMetier')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.workloadColFile')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('admin.workloadColRows')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.workloadColUploaded')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((w) => (
            <tr key={w.id} className="border-t border-slate-100">
              <td className="px-3 py-2.5">{w.metier}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{w.fileName}</td>
              <td className="px-3 py-2.5 text-right">{w.rowCount}</td>
              <td className="px-3 py-2.5 text-xs text-slate-500">{formatDate(w.uploadedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoriesTab() {
  const [items, setItems] = useState(PROTOTYPE_CATEGORIES);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  function add() {
    if (!name.trim()) return;
    setItems((i) => [...i, { id: `cat-${Date.now()}`, name, description: desc }]);
    pushToast(`Categoría "${name}" creada`, 'success');
    setName('');
    setDesc('');
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-end gap-2">
          <input
            placeholder={t('admin.catName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <input
            placeholder={t('admin.catDesc')}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="flex-[2] rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <Button onClick={add}>
            <Plus size={14} /> {t('admin.catAdd')}
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t('admin.catColName')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('admin.catColDesc')}</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2.5 font-medium text-slate-800">{c.name}</td>
                <td className="px-3 py-2.5 text-slate-600">{c.description}</td>
                <td className="px-2">
                  <button
                    onClick={() => setItems((x) => x.filter((y) => y.id !== c.id))}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RulesTab() {
  const [items] = useState(ALLOCATION_RULES);
  const t = useT();
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{t('admin.rulesColRule')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.rulesColMetier')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.rulesColCondition')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-3 py-2.5 font-medium text-slate-800">{r.name}</td>
              <td className="px-3 py-2.5">{r.metier}</td>
              <td className="px-3 py-2.5 text-slate-600">{r.rule}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RatesTab() {
  const [rates, setRates] = useState(K_EURO_RATES);
  const t = useT();
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{t('admin.ratesColMetier')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.ratesColCycle')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('admin.ratesColRate')}</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r, idx) => (
            <tr key={r.metier} className="border-t border-slate-100">
              <td className="px-3 py-2.5 font-medium text-slate-800">{r.metier}</td>
              <td className="px-3 py-2.5 text-slate-600">{r.cycleId}</td>
              <td className="px-3 py-2.5 text-right">
                <input
                  type="number"
                  step={0.05}
                  value={r.rate}
                  onChange={(e) =>
                    setRates((x) => x.map((v, i) => (i === idx ? { ...v, rate: Number(e.target.value) } : v)))
                  }
                  className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CyclesTab() {
  const cycles = useDataStore((s) => s.cycles);
  const storCreateCycle = useDataStore((s) => s.createCycle);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  function handleCreateCycle() {
    const activeCycle = cycles.find((c) => c.is_active);
    const name = window.prompt('Nombre del nuevo ciclo (ej: 2026 H2):');
    if (!name?.trim()) return;
    const msg = activeCycle
      ? `¿Crear "${name}"? El ciclo "${activeCycle.name}" se desactivará automáticamente (CYCLE-BR-04).`
      : `¿Crear el ciclo "${name}"?`;
    if (!window.confirm(msg)) return;
    storCreateCycle(name.trim(), new Date().toISOString().slice(0, 10), '');
    pushToast(`Ciclo "${name}" creado y activado`, 'success');
  }

  function closeCycle() {
    pushToast('Para cerrar un ciclo, creá uno nuevo — esto lo desactiva automáticamente (CYCLE-BR-04)', 'info');
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={handleCreateCycle}>
          <CalendarPlus size={14} /> {t('admin.cyclesCreate')}
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t('admin.cyclesColCycle')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('admin.cyclesColPeriod')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('admin.cyclesColStatus')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('admin.cyclesColActions')}</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2.5 font-medium text-slate-800">{c.name}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={clsx(
                      'rounded-full border px-2 py-0.5 text-xs font-medium',
                      c.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600',
                    )}
                  >
                    {c.is_active ? t('admin.cyclesActive') : t('admin.cyclesClosed')}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  {c.is_active && (
                    <Button size="sm" variant="secondary" onClick={() => closeCycle()}>
                      <Lock size={14} /> {t('admin.cyclesClose')}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
