import { useState } from 'react';
import type { AllocationRow } from '../../types';
import { splitFteProportional } from '../../lib/allocationCalc';
import { Modal } from '../shared/Modal';

interface SplitSlot {
  societe: string;
  percentage: number;
}

interface SplitModalProps {
  open: boolean;
  row: AllocationRow;
  societeOptions: string[];
  canViewKeuro?: boolean;
  onConfirm: (slots: SplitSlot[]) => void;
  onClose: () => void;
}

const DEFAULT_SLOTS: SplitSlot[] = [
  { societe: '', percentage: 50 },
  { societe: '', percentage: 50 },
];

export function SplitModal({ open, row, societeOptions, canViewKeuro, onConfirm, onClose }: SplitModalProps) {
  const years = Object.keys(row.fteByYear).sort();
  const [slots, setSlots] = useState<SplitSlot[]>(DEFAULT_SLOTS);
  // Track the last open+rowId pair that triggered a reset, to perform the reset during render
  // (React-recommended pattern for derived state from props — avoids setState-in-effect).
  const [lastResetKey, setLastResetKey] = useState<string | null>(null);
  const resetKey = open ? `open:${row.id}` : null;

  if (open && resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setSlots(DEFAULT_SLOTS);
  }

  const updateSlot = (idx: number, patch: Partial<SplitSlot>) =>
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const addSlot = () => setSlots(prev => [...prev, { societe: '', percentage: 0 }]);

  const pctSum = slots.reduce((a, s) => a + s.percentage, 0);
  const canConfirm = pctSum === 100 && slots.length >= 2;

  const ftePreviewBySlot = splitFteProportional(row.fteByYear, slots.map(s => s.percentage));
  const kePreviewBySlot = splitFteProportional(row.keByYear, slots.map(s => s.percentage));

  return (
    <Modal open={open} title={`Split — ${row.juCode} / ${row.plName}`} onClose={onClose}>
      <p className="text-sm text-gray-500 mb-3">
        Total FTE: {row.totalFte.toFixed(2)} — distribute by percentage (must sum to 100%)
      </p>

      <table className="w-full text-sm mb-3 border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-1 border text-left">Société</th>
            <th className="px-2 py-1 border text-right">%</th>
            {years.map(y => (
              <th key={`fte-${y}`} className="px-2 py-1 border text-right">FTE {y}</th>
            ))}
            {canViewKeuro && years.map(y => (
              <th key={`ke-${y}`} className="px-2 py-1 border text-right">K€ {y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, idx) => (
            <tr key={idx}>
              <td className="px-2 py-1 border">
                <select
                  value={slot.societe}
                  onChange={e => updateSlot(idx, { societe: e.target.value })}
                  className="border rounded px-1 text-sm w-full"
                >
                  <option value="">— Select —</option>
                  {societeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="px-2 py-1 border">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={slot.percentage}
                  onChange={e => updateSlot(idx, { percentage: parseFloat(e.target.value) || 0 })}
                  className="border rounded px-1 text-sm w-16 text-right"
                />
              </td>
              {years.map(y => (
                <td key={`fte-${y}`} className="px-2 py-1 border text-right text-gray-700">
                  {(ftePreviewBySlot[idx]?.[y] ?? 0).toFixed(2)}
                </td>
              ))}
              {canViewKeuro && years.map(y => (
                <td key={`ke-${y}`} className="px-2 py-1 border text-right text-gray-700">
                  {(kePreviewBySlot[idx]?.[y] ?? 0).toFixed(0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p className={`text-sm mb-3 ${pctSum !== 100 ? 'text-red-600' : 'text-green-700'}`}>
        Total: {pctSum}%{pctSum !== 100 ? ` (${Math.abs(100 - pctSum)}% ${pctSum < 100 ? 'remaining' : 'over'})` : ' ✓'}
      </p>

      <div className="flex justify-between items-center">
        <button onClick={addSlot} className="text-sm text-blue-600 hover:underline">
          + Add société
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">
            Cancel
          </button>
          <button
            disabled={!canConfirm}
            onClick={() => onConfirm(slots)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}
