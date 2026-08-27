import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  selectFramingSheet, parseFramingMatrix, readFramingWorkbook,
  isXlsxFileName, FramingParseError,
} from '../parseFramingFile';

const HEADERS = [
  'PL Number', 'Request type', 'Customer', 'Client', 'Part type', 'Fuel',
  'Project ranking', 'Alliance code', 'Vehicle code', 'Standard emissions',
  'Activity type', 'Owner N2', '4X2 / 4X4', 'Vehicle Phase', 'Secondary Organ',
  'EXPECTED ECO OUTPUT', 'Start of Project (SP)', 'Techno Group',
];

function row(over: Record<string, unknown> = {}): unknown[] {
  const base: Record<string, unknown> = {
    'PL Number': '', 'Request type': 'Creation', Customer: 'RG', Client: '',
    'Part type': 'Boîte de vitesse', Fuel: 'Essence', 'Project ranking': 'M',
    'Alliance code': 'HR10DDTG2', 'Vehicle code': 'X67', 'Standard emissions': 'E06C',
    'Activity type': 'CPU', 'Owner N2': 'H-DESIGN', '4X2 / 4X4': '4x4',
    'Vehicle Phase': 'PH1', 'Secondary Organ': 'SO', 'EXPECTED ECO OUTPUT': 'ECO2',
    'Start of Project (SP)': '2027-01-15', 'Techno Group': 'Diesel PWT',
  };
  return HEADERS.map((h) => (h in over ? over[h] : base[h]));
}

const matrix = (...rows: unknown[][]) => [HEADERS, ...rows];

describe('isXlsxFileName (§4.1)', () => {
  it.each(['a.xlsx', 'A.XLSX', 'framing file.xlsx'])('accepts %j', (n) => {
    expect(isXlsxFileName(n)).toBe(true);
  });
  it.each(['a.csv', 'a.xls', 'a.xlsm', 'a', 'a.xlsx.txt'])('rejects %j', (n) => {
    expect(isXlsxFileName(n)).toBe(false);
  });
});

describe('selectFramingSheet (§4.2)', () => {
  it('picks the first GWF-prefixed sheet', () => {
    expect(selectFramingSheet(['Data ref', 'GWF 2026', 'Notes'])).toBe('GWF 2026');
  });
  it('matches the GWF prefix case-insensitively', () => {
    expect(selectFramingSheet(['gwf_main'])).toBe('gwf_main');
  });
  it('excludes sheets whose name ends in old', () => {
    expect(selectFramingSheet(['GWF_old', 'GWFOLD', 'GWF new'])).toBe('GWF new');
  });
  it('returns null when only *old sheets match', () => {
    expect(selectFramingSheet(['GWF_old', 'GWF 2025 OLD'])).toBeNull();
  });
  it('returns null when nothing matches', () => {
    expect(selectFramingSheet(['Data ref', 'Sheet1'])).toBeNull();
  });
});

describe('parseFramingMatrix (§4.3)', () => {
  it('translates organ type and energy at upload', () => {
    const [line] = parseFramingMatrix(matrix(row()), 'f.xlsx', []);
    expect(line.organType).toBe('Gearbox');
    expect(line.energy).toBe('Gasoline');
  });

  it('drops Suppression and Closure rows', () => {
    const out = parseFramingMatrix(
      matrix(
        row({ 'Request type': 'Creation', 'PL Number': 'K1' }),
        row({ 'Request type': 'Suppression' }),
        row({ 'Request type': 'Closure' }),
      ),
      'f.xlsx', [],
    );
    expect(out).toHaveLength(1);
    expect(out[0].plNumber).toBe('K1');
  });

  it('resolves client with Customer priority and RG default', () => {
    const [a] = parseFramingMatrix(matrix(row({ Customer: 'Nissan', Client: 'Dacia' })), 'f.xlsx', []);
    expect(a.client).toBe('Nissan');
    const [b] = parseFramingMatrix(matrix(row({ Customer: '', Client: '' })), 'f.xlsx', []);
    expect(b.client).toBe('RG');
  });

  it('normalizes the drivetrain value', () => {
    const [line] = parseFramingMatrix(matrix(row({ '4X2 / 4X4': '4x4' })), 'f.xlsx', []);
    expect(line.drivetrain).toBe('4X4');
  });

  it('generates PL numbers for empty rows and composes PL Name from the result', () => {
    const [line] = parseFramingMatrix(matrix(row({ 'PL Number': '' })), 'f.xlsx', ['AA04']);
    expect(line.plNumber).toBe('AA05');
    expect(line.plName).toBe('AA05 CPU HR10DDTG2 SO E06C X67 4X4 PH1');
  });

  it('never reuses a PL number carried by another row of the same file', () => {
    const out = parseFramingMatrix(
      matrix(row({ 'PL Number': 'AA50' }), row({ 'PL Number': '' })),
      'f.xlsx', [],
    );
    expect(out[0].plNumber).toBe('AA50');
    expect(out[1].plNumber).toBe('AA51');
    expect(out[1].plNumber).not.toBe(out[0].plNumber);
  });

  it('classifies each row RFI or RFQ', () => {
    const out = parseFramingMatrix(
      matrix(
        row({ 'EXPECTED ECO OUTPUT': 'ECO2', 'PL Number': 'Q1' }),
        row({ 'EXPECTED ECO OUTPUT': 'N/A', 'PL Number': 'I1' }),
        row({ 'EXPECTED ECO OUTPUT': '', 'PL Number': 'I2' }),
      ),
      'f.xlsx', [],
    );
    expect(out.map((l) => l.track)).toEqual(['RFQ', 'RFI', 'RFI']);
  });

  it('records the upload filename as provenance', () => {
    const [line] = parseFramingMatrix(matrix(row()), 'framing-aug.xlsx', []);
    expect(line.createdByFile).toBe('framing-aug.xlsx');
    expect(line.lastUpdatedByFile).toBe('framing-aug.xlsx');
  });

  it('normalizes headers tolerantly — case, spacing and accents', () => {
    const shifted = [['  pl   NUMBER ', 'REQUEST TYPE'], ['Z9', 'Creation']];
    const [line] = parseFramingMatrix(shifted, 'f.xlsx', []);
    expect(line.plNumber).toBe('Z9');
    expect(line.requestType).toBe('Creation');
  });

  it('ignores unknown columns instead of failing', () => {
    const withJunk = [['PL Number', 'Totally Unknown'], ['Z9', 'whatever']];
    expect(() => parseFramingMatrix(withJunk, 'f.xlsx', [])).not.toThrow();
  });

  it('skips fully blank rows', () => {
    const out = parseFramingMatrix([HEADERS, row(), HEADERS.map(() => '')], 'f.xlsx', []);
    expect(out).toHaveLength(1);
  });

  it('throws when the matrix has no header row', () => {
    expect(() => parseFramingMatrix([], 'f.xlsx', [])).toThrow(FramingParseError);
  });

  it('does not compute Generate-time fields', () => {
    const [line] = parseFramingMatrix(matrix(row()), 'f.xlsx', []);
    expect(line).not.toHaveProperty('engineering');
    expect(line).not.toHaveProperty('estimateType');
    expect(line).not.toHaveProperty('injectionSystem');
    expect(line).not.toHaveProperty('market');
  });

  it('assigns a unique id per parsed line', () => {
    const out = parseFramingMatrix(matrix(row({ 'PL Number': 'A' }), row({ 'PL Number': 'B' })), 'f.xlsx', []);
    expect(new Set(out.map((l) => l.id)).size).toBe(2);
  });
});

describe('readFramingWorkbook (§4.2)', () => {
  function workbook(sheets: Record<string, unknown[][]>): ArrayBuffer {
    const wb = XLSX.utils.book_new();
    for (const [name, aoa] of Object.entries(sheets)) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
    }
    return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  }

  it('reads the GWF sheet and returns its matrix', () => {
    const buf = workbook({ 'Data ref': [['x']], 'GWF 26': matrix(row()) });
    const { sheetName, matrix: out } = readFramingWorkbook(buf);
    expect(sheetName).toBe('GWF 26');
    expect(out[0]).toContain('PL Number');
  });

  it('throws FramingParseError when no GWF sheet exists', () => {
    const buf = workbook({ 'Data ref': [['x']], GWF_old: matrix(row()) });
    expect(() => readFramingWorkbook(buf)).toThrow(FramingParseError);
  });
});
