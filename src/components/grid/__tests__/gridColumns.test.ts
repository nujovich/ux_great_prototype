import { describe, it, expect } from 'vitest';
import { getGridColumns, KEY_COLUMN_KEYS } from '../gridColumns';

describe('grid columns (HIW-174 G1)', () => {
  it('always returns the full column set (all PRD columns)', () => {
    const cols = getGridColumns().map((c) => c.key);
    // Must include key columns
    for (const k of KEY_COLUMN_KEYS) expect(cols).toContain(k);
    // Must include PRD extras
    for (const k of ['requestType', 'market', 'allianceCode', 'vehicleCode', 'spDate', 'pcDate', 'coDate', 'sopDate', 'engineering', 'estimateType', 'projectRanking', 'energyFuelType']) {
      expect(cols).toContain(k);
    }
  });

  it('returns more columns than KEY_COLUMN_KEYS alone', () => {
    expect(getGridColumns().length).toBeGreaterThan(KEY_COLUMN_KEYS.length);
  });

  it('every column has a stable key and an i18n label key', () => {
    for (const c of getGridColumns()) {
      expect(c.key).toBeTruthy();
      expect(c.labelKey).toMatch(/^gridCol\./);
    }
  });
});
