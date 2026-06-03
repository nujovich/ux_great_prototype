import React, { useState } from 'react';
import { Upload, Plus, Trash2, CalendarPlus, Lock, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { RoleGate } from '../components/shared/RoleGate';
import { StatusBadge } from '../components/shared/StatusBadge';
import { EmptyState } from '../components/shared/EmptyState';
import { useRoleStore } from '../store/roleStore';
import { Button } from '../components/shared/Button';
import { WORKLOAD_STANDARDS, PROTOTYPE_CATEGORIES, ALLOCATION_RULES } from '../fixtures/admin';
import { K_EURO_RATES } from '../fixtures/cycles';
import { useDataStore } from '../store/dataStore';
import { useUIStore } from '../store/uiStore';
import { useT } from '../i18n/useT';
import { formatDate } from '../lib/format';
import { InductorDeleteTab } from '../components/admin/InductorDeleteTab';
import { EMAIL_LOG } from '../fixtures/emailLog';
import type { Metier } from '../types';

type Tab = 'workload' | 'categories' | 'rules' | 'rates' | 'cycles' | 'inductors' | 'hvt' | 'emailLog';

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
    { key: 'inductors',   label: t('admin.tabInductors') },   // No requiresAdmin: RCRC can access (DEL-BR-01)
    { key: 'hvt',         label: t('admin.tabHvt'),          requiresAdmin: true },
    { key: 'emailLog',    label: t('admin.tabEmailLog'),     requiresAdmin: true },
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
      {tab === 'inductors' && <InductorDeleteTab />}
      {tab === 'hvt' && <HvtSimulationTab />}
      {tab === 'emailLog' && <EmailLogTab />}
    </div>
  );
}

function WorkloadStandardsTab() {
  const [items, setItems] = useState(WORKLOAD_STANDARDS);
  const [metier, setMetier] = useState<Metier>('H-DESIGN');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setValidationError(null);

    if (file && !file.name.endsWith('.xlsx')) {
      // WL-BR-02: only .xlsx accepted
      setValidationError('Only .xlsx files are accepted (WL-BR-02). Please select a valid Excel file.');
      setSelectedFile(null);
    }
  }

  function handleUpload() {
    if (!selectedFile) {
      setValidationError('Please select a file first.');
      return;
    }

    // WL-BR-06: structural validation before commit (simulated for prototype)
    if (selectedFile.size === 0) {
      setValidationError('File appears to be empty. Upload aborted (WL-BR-06).');
      return;
    }

    // WL-BR-04: versioned — add new version, old versions retained
    const id = `ws-${Date.now()}`;
    setItems((i) => [
      {
        id,
        metier,
        fileName: selectedFile.name,
        uploadedAt: new Date().toISOString(),
        rowCount: 100,  // prototype: row count unknown until backend processes
      },
      ...i,
    ]);
    pushToast(`Archivo ${selectedFile.name} cargado para métier ${metier}`, 'success');
    setSelectedFile(null);
    setValidationError(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 font-semibold text-slate-800">{t('admin.workloadUpload')}</h3>
        <div className="flex flex-wrap items-end gap-2">
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
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500">File (.xlsx only — WL-BR-02)</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileSelect}
              className="mt-1 text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>
          <Button onClick={handleUpload} disabled={!selectedFile || !!validationError}>
            <Upload size={14} /> {t('admin.workloadBtn')}
          </Button>
        </div>
        {validationError && (
          <p className="mt-2 text-sm text-red-600">{validationError}</p>
        )}
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

function HvtSimulationTab() {
  const lines = useDataStore((s) => s.lines);
  const simulateHvtApproval = useDataStore((s) => s.simulateHvtApproval);
  const pushToast = useUIStore((s) => s.pushToast);
  const t = useT();

  const sentLines = lines.filter((l) => l.status === 'Sent');

  function handleApproveAll() {
    const ids = sentLines.map((l) => l.id);
    simulateHvtApproval(ids);
    pushToast(`HVT simulado: ${ids.length} línea(s) → Approved`, 'success');
  }

  if (sentLines.length === 0) {
    return <EmptyState title={t('admin.hvtNoSent')} />;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm text-amber-800">{t('admin.hvtDesc')}</p>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleApproveAll}>
          <CheckCircle2 size={14} /> {t('admin.hvtApproveAll')} ({sentLines.length})
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Line</th>
              <th className="px-3 py-2 text-left font-medium">Métier</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sentLines.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-3 py-2.5 font-medium">{l.lineName}</td>
                <td className="px-3 py-2.5">{l.metier}</td>
                <td className="px-3 py-2.5"><StatusBadge status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

function EmailLogTab() {
  const cycles = useDataStore((s) => s.cycles);
  const activeCycleId = cycles.find((c) => c.is_active)?.id;
  const t = useT();

  // EMAIL-BR-04: filter to active cycle only
  const logs = EMAIL_LOG.filter((e) => e.cycleId === activeCycleId);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="font-semibold text-slate-800">{t('admin.emailLogTitle')}</h3>
        <p className="mt-1 text-xs text-slate-500">{t('admin.emailLogDesc')}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t('admin.emailColTime')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('admin.emailColRecipient')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('admin.emailColType')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('admin.emailColCycle')}</th>
              <th className="px-3 py-2 text-left font-medium">{t('admin.emailColStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-400">
                  No emails logged for the active cycle.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-600">{formatDate(log.timestamp)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{log.recipient}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                      {log.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{log.cycleId}</td>
                  <td className="px-3 py-2">
                    {log.success ? (
                      <span className="text-xs font-medium text-emerald-700">✓ sent</span>
                    ) : (
                      <span className="text-xs font-medium text-red-600" title={log.errorMessage}>
                        ✗ failed
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
