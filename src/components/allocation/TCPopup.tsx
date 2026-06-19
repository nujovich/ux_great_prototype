import { useState } from 'react';
import type { AllocationRow } from '../../types';
import { distributeTcKeByYear } from '../../lib/allocationCalc';
import { Modal } from '../shared/Modal';

interface TCPopupProps {
  open: boolean;
  row: AllocationRow;
  /** Year columns shown in the grid; the popup mirrors them so both views agree. */
  activeYears?: string[];
  onConfirm: (keByYear: Record<string, number>) => void;
  onCancel: () => void;
}

export function TCPopup({ open, row, activeYears, onConfirm, onCancel }: TCPopupProps) {
  const years = (activeYears ?? Object.keys(row.fteByYear)).slice().sort();
  const initial = () => Object.fromEntries(years.map((y) => [y, row.keByYear[y] ?? 0]));
  const [totalKe, setTotalKe] = useState(0);
  const [yearlyKe, setYearlyKe] = useState<Record<string, number>>(initial);
  const [touched, setTouched] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  // Reset derived state when the popup (re)opens for a row (render-time pattern).
  const [lastResetKey, setLastResetKey] = useState<string | null>(null);
  const resetKey = open ? `open:${row.id}` : null;
  if (open && resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setTotalKe(0);
    setYearlyKe(initial());
    setTouched(false);
    setConfirmingClose(false);
  }

  const handleTotalChange = (value: number) => {
    setTotalKe(value);
    setYearlyKe(distributeTcKeByYear(value, row.fteByYear));
    setTouched(true);
  };

  const handleYearChange = (year: string, value: number) => {
    setYearlyKe((prev) => ({ ...prev, [year]: value }));
    setTouched(true);
  };

  const requestCancel = () => {
    if (touched) setConfirmingClose(true);
    else onCancel();
  };

  const runningTotal = Object.values(yearlyKe).reduce((a, b) => a + b, 0);
  const canConfirm = !!row.societe;

  return (
    <Modal open={open} title={`TC K€ — ${row.juCode} / ${row.plName}`} onClose={requestCancel}>
      {!row.societe && (
        <p className="text-red-600 text-sm mb-3">
          Societe is required before setting TC K€ (ALLOC-BR-13).
        </p>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="tc-total-ke">
          Total K€
        </label>
        <input
          id="tc-total-ke"
          aria-label="Total K€"
          type="number"
          min={0}
          value={totalKe || ''}
          onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
          className="border rounded px-2 py-1 text-sm w-32"
        />
        <span className="ml-2 text-xs text-gray-500">Pre-fills yearly values by FTE share</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {years.map((year) => (
          <label key={year} className="flex flex-col text-sm gap-1">
            <span>K€ {year}</span>
            <input
              aria-label={`K€ ${year}`}
              type="number"
              min={0}
              value={yearlyKe[year] ?? 0}
              onChange={(e) => handleYearChange(year, parseFloat(e.target.value) || 0)}
              className="border rounded px-2 py-1 text-sm w-28"
            />
          </label>
        ))}
      </div>

      <p className="text-sm text-gray-600 mb-4">{`Running total: ${runningTotal.toFixed(0)} K€`}</p>

      {confirmingClose ? (
        <div className="border-t pt-3">
          <p className="text-sm text-amber-700 mb-3">
            You will leave without saving the entered K€. Discard changes?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmingClose(false)}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Keep editing
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Discard
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <button
            onClick={requestCancel}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!canConfirm}
            onClick={() => onConfirm(yearlyKe)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      )}
    </Modal>
  );
}
