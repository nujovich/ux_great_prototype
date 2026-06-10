import { describe, it, expect } from 'vitest';
import { getGridColumns, KEY_COLUMN_KEYS } from '../gridColumns';

describe('grid columns (HIW-174 §4)', () => {
  it('default (showAll=false) returns only the key columns', () => {
    const cols = getGridColumns(false).map((c) => c.key);
    expect(cols).toEqual([...KEY_COLUMN_KEYS]);
  });

  it('showAll=true is a superset that adds the PRD extras', () => {
    const keyCols = getGridColumns(false).map((c) => c.key);
    const allCols = getGridColumns(true).map((c) => c.key);
    expect(allCols.length).toBeGreaterThan(keyCols.length);
    for (const k of keyCols) expect(allCols).toContain(k);
    // PRD extras present only in show-all
    for (const k of ['requestType', 'market', 'allianceCode', 'vehicleCode', 'spDate', 'pcDate', 'coDate', 'sopDate', 'engineering', 'estimateType', 'projectRanking', 'energyFuelType']) {
      expect(allCols).toContain(k);
    }
  });

  it('every column has a stable key and an i18n label key', () => {
    for (const c of getGridColumns(true)) {
      expect(c.key).toBeTruthy();
      expect(c.labelKey).toMatch(/^gridCol\./);
    }
  });
});
