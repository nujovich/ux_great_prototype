export type ColumnAlign = 'left' | 'right';

export interface GridColumn {
  /** stable identifier; for plain PRD fields this equals the ProjectLine field name */
  key: string;
  /** i18n key under the `gridCol` namespace */
  labelKey: string;
  align?: ColumnAlign;
  /** 'key' = always shown; 'extra' = only when "show all columns" is on */
  group: 'key' | 'extra';
}

const COLUMNS: GridColumn[] = [
  { key: 'status', labelKey: 'gridCol.status', group: 'key' },
  { key: 'plNumber', labelKey: 'gridCol.plNumber', group: 'key' },
  { key: 'plName', labelKey: 'gridCol.plName', group: 'key' },
  { key: 'client', labelKey: 'gridCol.client', group: 'key' },
  { key: 'metier', labelKey: 'gridCol.metier', group: 'key' },
  { key: 'organType', labelKey: 'gridCol.organType', group: 'key' },
  { key: 'injectionSystem', labelKey: 'gridCol.injectionSystem', group: 'key' },
  { key: 'assignee', labelKey: 'gridCol.assignee', group: 'key' },
  { key: 'estimatedDays', labelKey: 'gridCol.days', align: 'right', group: 'key' },
  // ── extras (PRD full set) ──
  { key: 'requestType', labelKey: 'gridCol.requestType', group: 'extra' },
  { key: 'projectRanking', labelKey: 'gridCol.projectRanking', group: 'extra' },
  { key: 'market', labelKey: 'gridCol.market', group: 'extra' },
  { key: 'allianceCode', labelKey: 'gridCol.allianceCode', group: 'extra' },
  { key: 'vehicleCode', labelKey: 'gridCol.vehicleCode', group: 'extra' },
  { key: 'energy', labelKey: 'gridCol.energy', group: 'extra' },
  { key: 'spDate', labelKey: 'gridCol.spDate', group: 'extra' },
  { key: 'pcDate', labelKey: 'gridCol.pcDate', group: 'extra' },
  { key: 'coDate', labelKey: 'gridCol.coDate', group: 'extra' },
  { key: 'sopDate', labelKey: 'gridCol.sopDate', group: 'extra' },
  { key: 'engineering', labelKey: 'gridCol.engineering', group: 'extra' },
  { key: 'estimateType', labelKey: 'gridCol.estimateType', group: 'extra' },
];

export const KEY_COLUMN_KEYS = COLUMNS.filter((c) => c.group === 'key').map((c) => c.key);

export function getGridColumns(showAll: boolean): GridColumn[] {
  return showAll ? COLUMNS : COLUMNS.filter((c) => c.group === 'key');
}
