import type { AllocationFilterState } from '../../types';

interface AllocationFiltersProps {
  filters: AllocationFilterState;
  onChange: (filters: AllocationFilterState) => void;
  metierOptions: string[];
  ownerN2Options: string[];
  societeOptions: string[];
}

export function AllocationFilters({
  filters,
  onChange,
  metierOptions,
  ownerN2Options,
  societeOptions,
}: AllocationFiltersProps) {
  const set = (patch: Partial<AllocationFilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border-b">
      <input
        type="text"
        placeholder="PL Number / Name"
        value={filters.plSearch}
        onChange={e => set({ plSearch: e.target.value })}
        className="border rounded px-2 py-1 text-sm w-44"
        aria-label="PL Number / Name search"
      />

      <label className="flex items-center gap-1 text-sm">
        <span className="text-gray-600">Métier</span>
        <select
          aria-label="Métier"
          value={filters.metier}
          onChange={e => set({ metier: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {metierOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>

      <label className="flex items-center gap-1 text-sm">
        <span className="text-gray-600">Owner N2</span>
        <select
          aria-label="Owner N2"
          value={filters.ownerN2}
          onChange={e => set({ ownerN2: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          {ownerN2Options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>

      <label className="flex items-center gap-1 text-sm">
        <span className="text-gray-600">Société</span>
        <select
          aria-label="Société"
          value={filters.societe}
          onChange={e => set({ societe: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          <option value="__unassigned__">Unassigned</option>
          {societeOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className="flex items-center gap-1 text-sm">
        <span className="text-gray-600">Cost Type</span>
        <select
          aria-label="Cost Type"
          value={filters.costType}
          onChange={e => set({ costType: e.target.value })}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          <option value="FTE">FTE</option>
          <option value="TSA">TSA</option>
          <option value="TC">TC</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          aria-label="Show unresolved only"
          checked={filters.unresolvedOnly}
          onChange={e => set({ unresolvedOnly: e.target.checked })}
        />
        <span>Show unresolved only</span>
      </label>
    </div>
  );
}
