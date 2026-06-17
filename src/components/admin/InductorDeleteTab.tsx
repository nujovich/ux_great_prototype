import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../shared/Button';
import { Modal } from '../shared/Modal';
import { EmptyState } from '../shared/EmptyState';
import { useT } from '../../i18n/useT';
import { INDUCTORS } from '../../fixtures/inductors';
import type { PrototypeInductor } from '../../types';

interface InductorEntry extends PrototypeInductor {
  version: 'active' | 'superseded';
}

// For prototype: all current inductors are "active version"
const ALL_INDUCTORS: InductorEntry[] = INDUCTORS.map((ind) => ({ ...ind, version: 'active' as const }));

const ONLY_ONE_VERSION = true; // prototype has single version — triggers DEL-BR-05 protection

export function InductorDeleteTab() {
  const t = useT();
  const [items, setItems] = useState<InductorEntry[]>(ALL_INDUCTORS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastSummary, setLastSummary] = useState<{ deleted: number; skipped: number } | null>(null);

  // DEL-BR-02: show only already-loaded inductors (items state)
  const categories = useMemo(() => ['all', ...new Set(items.map((i) => i.category))], [items]);

  // DEL-BR-14 / DEL-BR-08: filter does not clear selection
  const visible = useMemo(
    () => items.filter((i) => categoryFilter === 'all' || i.category === categoryFilter),
    [items, categoryFilter],
  );

  // DEL-BR-03: header checkbox selects/deselects all visible
  function toggleAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((i) => (checked ? next.add(i.id) : next.delete(i.id)));
      return next;
    });
  }

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function confirmDelete() {
    // DEL-BR-05: active version protected if it is the only version
    const toDelete = items.filter((i) => selected.has(i.id));
    const [skippable, deletable] = toDelete.reduce<[InductorEntry[], InductorEntry[]]>(
      ([s, d], item) => {
        if (item.version === 'active' && ONLY_ONE_VERSION) return [[...s, item], d];
        return [s, [...d, item]];
      },
      [[], []],
    );

    setItems((prev) => prev.filter((i) => !deletable.map((d) => d.id).includes(i.id)));
    setSelected(new Set());
    setLastSummary({ deleted: deletable.length, skipped: skippable.length });
    setShowConfirm(false);
  }

  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i.id));

  if (items.length === 0) {
    return <EmptyState title={t('admin.delEmpty')} />;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <h3 className="font-semibold text-slate-800">{t('admin.delTitle')}</h3>
        <p className="mt-1 text-xs text-slate-500">{t('admin.delDesc')}</p>
      </div>

      {lastSummary && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t('admin.delSummary', {
            deleted: String(lastSummary.deleted),
            skipped: String(lastSummary.skipped),
          })}
        </div>
      )}

      <div className="flex items-end justify-between">
        <div className="flex items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-500">{t('admin.delFilterCategory')}</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All' : c}</option>)}
            </select>
          </div>
        </div>
        {/* DEL-BR-09: delete button disabled when no rows selected */}
        <Button
          variant="danger"
          disabled={selected.size === 0}
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 size={14} /> {t('admin.delDeleteBtn', { n: String(selected.size) })}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {/* DEL-BR-03: header checkbox */}
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-left font-medium">Version</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((ind) => {
              const isProtected = ind.version === 'active' && ONLY_ONE_VERSION;
              return (
                <tr
                  key={ind.id}
                  className={`border-t border-slate-100 ${isProtected ? 'opacity-50' : ''}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(ind.id)}
                      disabled={isProtected}
                      onChange={(e) => toggleRow(ind.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">{ind.name}</td>
                  <td className="px-3 py-2 text-slate-600">{ind.category}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ind.version === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ind.version}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* DEL-BR-04: confirm before delete */}
      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={t('admin.delConfirmTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>{t('admin.delCancel')}</Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('admin.delConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {t('admin.delConfirmDesc', { n: String(selected.size) })}
        </p>
      </Modal>
    </div>
  );
}
