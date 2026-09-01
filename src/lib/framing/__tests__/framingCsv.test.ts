import { describe, it, expect } from 'vitest';
import { buildFramingCsvRows, type FramingCsvColumn } from '../framingCsv';
import { EMPTY_FRAMING_LINE, type FramingLine } from '../../../types/framing';

const line = (over: Partial<FramingLine>): FramingLine => ({ ...EMPTY_FRAMING_LINE, ...over });

const COLUMNS: FramingCsvColumn[] = [
  { key: 'plNumber', label: 'PL Number' },
  { key: 'projectName', label: 'Project Name' },
  { key: 'client', label: 'Client' },
];

describe('buildFramingCsvRows (Task 7, HIW-452 remediation)', () => {
  it('returns a header row built from the given columns, in order', () => {
    const [header] = buildFramingCsvRows([], COLUMNS);
    expect(header.split(',')).toEqual(['PL Number', 'Project Name', 'Client']);
  });

  it('emits one data row per line, cells in column order', () => {
    const lines = [line({ plNumber: 'AA00', projectName: 'Gearbox uplift', client: 'RG' })];
    const rows = buildFramingCsvRows(lines, COLUMNS);
    expect(rows).toHaveLength(2);
    expect(rows[1].split(',')).toEqual(['AA00', 'Gearbox uplift', 'RG']);
  });

  it('reflects exactly the rows it is handed — not some larger set', () => {
    // The whole point of the "currently visible" export: this function has
    // no notion of a full dataset, only of what the caller passed in.
    const all = [
      line({ plNumber: 'AA00', client: 'RG' }),
      line({ plNumber: 'AA01', client: 'Dacia' }),
      line({ plNumber: 'AA02', client: 'RG' }),
    ];
    const filteredToRg = all.filter((l) => l.client === 'RG');
    const rows = buildFramingCsvRows(filteredToRg, COLUMNS);
    expect(rows).toHaveLength(3); // header + 2 RG rows, not 3
    expect(rows.some((r) => r.includes('AA01'))).toBe(false);
  });

  it('reflects the order it is handed — sorting is the caller\'s job', () => {
    const descByPl = [
      line({ plNumber: 'AB00' }),
      line({ plNumber: 'AA01' }),
      line({ plNumber: 'AA00' }),
    ];
    const rows = buildFramingCsvRows(descByPl, COLUMNS);
    expect(rows.slice(1).map((r) => r.split(',')[0])).toEqual(['AB00', 'AA01', 'AA00']);
  });

  it('escapes a cell containing a comma', () => {
    const rows = buildFramingCsvRows([line({ plNumber: 'AA00', projectName: 'Uplift, phase 2' })], COLUMNS);
    expect(rows[1]).toContain('"Uplift, phase 2"');
  });

  it('escapes a cell containing a double quote by doubling it', () => {
    const rows = buildFramingCsvRows([line({ plNumber: 'AA00', projectName: 'The "big" one' })], COLUMNS);
    expect(rows[1]).toContain('"The ""big"" one"');
  });

  it('renders a null/undefined-ish cell as an empty string, not "null"', () => {
    const rows = buildFramingCsvRows([line({ plNumber: 'AA00', annualVolumeSop: null })], [
      { key: 'plNumber', label: 'PL Number' },
      { key: 'annualVolumeSop', label: 'Annual volume SOP' },
    ]);
    expect(rows[1].split(',')[1]).toBe('');
  });

  it('returns only the header row for an empty line set', () => {
    const rows = buildFramingCsvRows([], COLUMNS);
    expect(rows).toHaveLength(1);
  });
});
