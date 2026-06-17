import type { AllocationRow, CostType } from '../../types';
import { SOCIETES } from '../../fixtures/societes';
import { groupRowsByPl, rowIsUnresolved } from '../../lib/allocationCalc';

interface AllocationGridProps {
  rows: AllocationRow[];
  canEdit: boolean;
  selectedIds: string[];
  onSelectRow: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean, ids: string[]) => void;
  onChangeSociete: (rowId: string, societe: string) => void;
  onChangeCostType: (rowId: string, costType: CostType) => void;
  onSplit: (rowId: string) => void;
  onUndoSplit: (rowId: string) => void;
  activeYears: string[];
  canViewKeuro: boolean;
  onEditTcKe: (rowId: string) => void;
}

export function AllocationGrid({
  rows,
  canEdit,
  selectedIds,
  onSelectRow,
  onSelectAll,
  onChangeSociete,
  onChangeCostType,
  onSplit,
  onUndoSplit,
  activeYears,
  canViewKeuro,
  onEditTcKe,
}: AllocationGridProps) {
  const groups = groupRowsByPl(rows);

  if (groups.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-gray-400">
        No job units match the current filters.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map(group => {
        const groupIds = group.rows.map(r => r.id);
        const allSelected = groupIds.every(id => selectedIds.includes(id));
        return (
          <div key={group.plNumber} className="overflow-x-auto">
            <div className="flex items-baseline gap-2 px-1 py-2">
              <span className="font-mono font-semibold text-sm">{group.plNumber}</span>
              <span className="text-sm text-gray-600">{group.plName}</span>
              <span className="text-xs text-gray-400">
                ({group.rows.length} métier{group.rows.length !== 1 ? 's' : ''})
              </span>
            </div>
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  {canEdit && (
                    <th className="px-2 py-1 border">
                      <input
                        type="checkbox"
                        aria-label={`Select all ${group.plNumber}`}
                        checked={allSelected}
                        onChange={e => onSelectAll(e.target.checked, groupIds)}
                      />
                    </th>
                  )}
                  <th className="px-2 py-1 border text-left">Métier</th>
                  <th className="px-2 py-1 border text-left">Owner N2</th>
                  <th className="px-2 py-1 border text-left">PL #</th>
                  <th className="px-2 py-1 border text-left">PL Name</th>
                  <th className="px-2 py-1 border text-left">Société</th>
                  <th className="px-2 py-1 border text-left">Cost Type</th>
                  <th className="px-2 py-1 border text-left">Organ Type</th>
                  <th className="px-2 py-1 border text-left">Energy</th>
                  <th className="px-2 py-1 border text-left">Alliance</th>
                  <th className="px-2 py-1 border text-left">Vehicle</th>
                  <th className="px-2 py-1 border text-left">Emissions</th>
                  <th className="px-2 py-1 border text-left">Market</th>
                  <th className="px-2 py-1 border text-left">FMM Desc</th>
                  <th className="px-2 py-1 border text-left">JU Desc</th>
                  <th className="px-2 py-1 border text-left">JU Code</th>
                  <th className="px-2 py-1 border text-right">Total FTE</th>
                  {activeYears.map(y => (
                    <th key={`fte-${y}`} className="px-2 py-1 border text-right">
                      FTE {y}
                    </th>
                  ))}
                  {canViewKeuro &&
                    activeYears.map(y => (
                      <th key={`ke-${y}`} className="px-2 py-1 border text-right">
                        K€ {y}
                      </th>
                    ))}
                  {canViewKeuro && canEdit && <th className="px-2 py-1 border">K€</th>}
                  {canEdit && <th className="px-2 py-1 border">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {group.rows.map(row => (
            <tr
              key={row.id}
              className={`border-b hover:bg-blue-50 ${rowIsUnresolved(row) ? 'bg-red-50' : ''} ${
                row.isDirty ? 'ring-1 ring-amber-300' : ''
              }`}
            >
              {canEdit && (
                <td className="px-2 py-1 border text-center">
                  <input
                    type="checkbox"
                    aria-label={`Select row ${row.id}`}
                    checked={selectedIds.includes(row.id)}
                    onChange={e => onSelectRow(row.id, e.target.checked)}
                  />
                </td>
              )}
              <td className="px-2 py-1 border">{row.metier}</td>
              <td className="px-2 py-1 border">{row.ownerN2}</td>
              <td className="px-2 py-1 border font-mono">{row.plNumber}</td>
              <td className="px-2 py-1 border">{row.plName}</td>
              <td className="px-2 py-1 border">
                {canEdit ? (
                  <select
                    value={row.societe ?? ''}
                    onChange={e => onChangeSociete(row.id, e.target.value)}
                    className={`border rounded px-1 text-xs w-full ${
                      !row.societe && row.costType !== 'FTE' ? 'border-red-400' : ''
                    }`}
                    aria-label={`Société for ${row.id}`}
                  >
                    <option value="">— Unassigned —</option>
                    {SOCIETES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{row.societe ?? '—'}</span>
                )}
              </td>
              <td className="px-2 py-1 border">
                {canEdit ? (
                  <select
                    value={row.costType}
                    onChange={e => onChangeCostType(row.id, e.target.value as CostType)}
                    className="border rounded px-1 text-xs"
                    aria-label={`Cost Type for ${row.id}`}
                  >
                    <option value="FTE">FTE</option>
                    <option value="TSA">TSA</option>
                    <option value="TC">TC</option>
                  </select>
                ) : (
                  <span>{row.costType}</span>
                )}
              </td>
              <td className="px-2 py-1 border">{row.organType}</td>
              <td className="px-2 py-1 border">{row.energy}</td>
              <td className="px-2 py-1 border">{row.allianceCode}</td>
              <td className="px-2 py-1 border">{row.vehicleCode}</td>
              <td className="px-2 py-1 border">{row.standardEmissions}</td>
              <td className="px-2 py-1 border">{row.market}</td>
              <td
                className="px-2 py-1 border max-w-[120px] truncate"
                title={row.fmmDescription}
              >
                {row.fmmDescription}
              </td>
              <td
                className="px-2 py-1 border max-w-[120px] truncate"
                title={row.juDescription}
              >
                {row.juDescription}
              </td>
              <td className="px-2 py-1 border font-mono">{row.juCode}</td>
              <td className="px-2 py-1 border text-right">{row.totalFte.toFixed(2)}</td>
              {activeYears.map(y => (
                <td key={`fte-${y}`} className="px-2 py-1 border text-right">
                  {(row.fteByYear[y] ?? 0).toFixed(2)}
                </td>
              ))}
              {canViewKeuro &&
                activeYears.map(y => (
                  <td
                    key={`ke-${y}`}
                    className={`px-2 py-1 border text-right ${row.isDirty ? 'text-amber-600' : ''}`}
                  >
                    {(row.keByYear[y] ?? 0).toFixed(0)}
                  </td>
                ))}
              {canViewKeuro && canEdit && (
                <td className="px-2 py-1 border text-center">
                  {row.costType === 'TC' && (
                    <button
                      type="button"
                      aria-label={`Edit K€ for ${row.id}`}
                      onClick={() => onEditTcKe(row.id)}
                      className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100"
                    >
                      Edit K€
                    </button>
                  )}
                </td>
              )}
                    {canEdit && (
                      <td className="px-2 py-1 border text-center">
                        {row.isSplitChild ? (
                          <button
                            onClick={() => onUndoSplit(row.id)}
                            className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100"
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            onClick={() => onSplit(row.id)}
                            className="text-xs px-2 py-0.5 border rounded hover:bg-gray-100"
                          >
                            Split
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
