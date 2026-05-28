import { useState } from 'react';
import { X } from 'lucide-react';
import { INDUCTORS } from '../../fixtures/inductors';
import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';

interface Props {
  activeInductorIds: string[];
  onApply: (inductorIds: string[]) => void;
  onClose: () => void;
}

export function ManageInductorsModal({ activeInductorIds, onApply, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(activeInductorIds));
  const t = useT();

  const categories = [...new Set(INDUCTORS.map((i) => i.category))].sort();

  function toggleInductor(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      const isPresent = next.has(id);
      const result = isPresent ? next.delete(id) : next.add(id);
      return result ? next : prev;
    });
  }

  function toggleCategory(cat: string) {
    const inCat = INDUCTORS.filter((i) => i.category === cat).map((i) => i.id);
    const allSelected = inCat.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      inCat.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">{t('manageInductors.title')}</h3>
            <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 p-5">
            {categories.map((cat) => {
              const inCat = INDUCTORS.filter((i) => i.category === cat);
              const selCount = inCat.filter((i) => selected.has(i.id)).length;
              const allSel = selCount === inCat.length;
              const someSel = selCount > 0 && !allSel;

              return (
                <div key={cat} className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allSel}
                      ref={(el) => { if (el) el.indeterminate = someSel; }}
                      onChange={() => toggleCategory(cat)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
                    />
                    <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {cat}
                    </span>
                    <span className="text-[10px] text-slate-400">{selCount}/{inCat.length}</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {inCat.map((ind) => (
                      <label
                        key={ind.id}
                        className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(ind.id)}
                          onChange={() => toggleInductor(ind.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
                        />
                        <span className="text-xs text-slate-700">{ind.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
            <Button variant="secondary" size="sm" onClick={onClose}>{t('manageInductors.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={() => onApply([...selected])}>
              {t('manageInductors.apply', { n: selected.size })}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
