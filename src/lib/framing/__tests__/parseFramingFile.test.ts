import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  selectFramingSheet, parseFramingMatrix, readFramingWorkbook,
  isXlsxFileName, FramingParseError, findHeaderRow,
} from '../parseFramingFile';
import {
  REAL_SHAPE_MATRIX, REAL_SHAPE_MATRIX_WEEK_CODES, realShapeWorkbookBuffer,
} from './realShapeFixture';
import { InvalidStartingPlNumberError } from '../plNumber';

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

  it('does not let an empty MA Date column erase a real SOP date', () => {
    const headers = ['PL Number', 'Start of Production (SOP)', 'MA Date (MA/APR3)MA'];
    const [line] = parseFramingMatrix([headers, ['Z1', '2030-01-01', '']], 'f.xlsx', []);
    expect(line.sopDate).toBe('2030-01-01');
  });

  it('falls back to MA Date when SOP is absent', () => {
    const headers = ['PL Number', 'Start of Production (SOP)', 'MA Date (MA/APR3)MA'];
    const [line] = parseFramingMatrix([headers, ['Z2', '', '2031-05-01']], 'f.xlsx', []);
    expect(line.sopDate).toBe('2031-05-01');
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

  it('tags a missing header row with the noHeaderRow code — I2', () => {
    try {
      parseFramingMatrix([], 'f.xlsx', []);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(FramingParseError);
      expect((err as FramingParseError).code).toBe('noHeaderRow');
    }
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

describe('HEADER_ALIASES — real file headers (conformance P2)', () => {
  const parseOne = (header: string, value: unknown) => {
    const [line] = parseFramingMatrix(
      [['PL Number', header], ['P1', value]],
      'f.xlsx', [],
    );
    return line;
  };

  it('maps SOP Date Powertrain to sopDate — the SOP milestone the readiness rules depend on', () => {
    expect(parseOne('SOP Date Powertrain', '2027-03-01').sopDate).toBe('2027-03-01');
  });

  it('maps Date envoi RFQ to rfqSendDate', () => {
    expect(parseOne('Date envoi RFQ', '2026-11-01').rfqSendDate).toBe('2026-11-01');
  });

  it('maps Vehicle \\nRange (embedded newline) to vehicleRange', () => {
    expect(parseOne('Vehicle \nRange', 'C').vehicleRange).toBe('C');
  });

  it('maps ICE\\nPower (kW) to icePowerKw', () => {
    expect(parseOne('ICE\nPower (kW)', '90').icePowerKw).toBe(90);
  });

  it('maps ICE\\nTorque\\n(N.m) to iceTorqueNm', () => {
    expect(parseOne('ICE\nTorque\n(N.m)', '250').iceTorqueNm).toBe(250);
  });

  it('maps Vehicle MA to vehicleMaDate', () => {
    expect(parseOne('Vehicle MA', '2028-05-01').vehicleMaDate).toBe('2028-05-01');
  });

  it('maps Veh factory to vehicleFactory', () => {
    expect(parseOne('Veh factory', 'Douai').vehicleFactory).toBe('Douai');
  });

  it('maps the long #Protos EP header to protosEp', () => {
    expect(parseOne('#Protos EP (Engineering Prototypes - LEAP100)', '3').protosEp).toBe(3);
  });

  it('maps Part factory (lowercase f) to partFactory', () => {
    expect(parseOne('Part factory', 'Cleon').partFactory).toBe('Cleon');
  });

  it('prefix-matches the long 3MIS header (with explanatory tail) to threeMis', () => {
    const header = '3MIS (K‰)\nif different of AnnualQ target sent by RG Quality  to H';
    expect(parseOne(header, '12.5').threeMis).toBe('12.5');
  });

  it('prefix-matches the long Guarantee cost header to guaranteeCost', () => {
    const header = 'Guarantee cost (€/vh\nif different of AnnualQ target sent by RG Quality  to H';
    expect(parseOne(header, '450').guaranteeCost).toBe('450');
  });

  it('prefix-matches the long PIMOF header to pimof', () => {
    const header = 'PIMOF (K‰)\nif different of AnnualQ target sent by RG Quality  to H';
    expect(parseOne(header, '7.1').pimof).toBe('7.1');
  });

  it('prefix-matches the long Request description header to requestDescription', () => {
    const header = 'Request description,\n - to explain content to H\n-  to incl. Vehicle evolutions or main ET  inductors';
    expect(parseOne(header, 'severisation NOx').requestDescription).toBe('severisation NOx');
  });

  it('exact aliases still win over the prefix step (existing short-form header)', () => {
    expect(parseOne('Guarantee cost', '99').guaranteeCost).toBe('99');
  });

  it.each([
    ['Annual volume - SOP', 'annualVolumeSop'],
    ['Annual volume - SOP+1', 'annualVolumeSopPlus1'],
    ['Annual volume - SOP+2 ', 'annualVolumeSopPlus2'],
    ['Annual volume - SOP+3', 'annualVolumeSopPlus3'],
    ['Annual volume - SOP+4', 'annualVolumeSopPlus4'],
    ['Annual volume - SOP+5', 'annualVolumeSopPlus5'],
    ['Annual volume - SOP+6', 'annualVolumeSopPlus6'],
  ] as const)('maps the hyphenated header %j to %s', (header, field) => {
    const line = parseOne(header, '1000');
    expect((line as unknown as Record<string, unknown>)[field]).toBe(1000);
  });

  it('still maps the non-hyphenated Annual volume SOP+2 header (backward compatible)', () => {
    expect(parseOne('Annual volume SOP+2', '2000').annualVolumeSopPlus2).toBe(2000);
  });
});

describe('findHeaderRow (conformance P1)', () => {
  const junkRow = (overrides: Record<number, string> = {}): unknown[] => {
    const cells = HEADERS.map(() => '');
    Object.entries(overrides).forEach(([i, v]) => { cells[Number(i)] = v; });
    return cells;
  };

  it('locates the header row at index 0 when there is no leading junk', () => {
    expect(findHeaderRow(matrix(row()))).toBe(0);
  });

  it('locates a header row buried behind 8 leading instruction rows', () => {
    const buried = [
      junkRow(),
      junkRow({ 0: 'For a proper estimation, all fields are mandatory.' }),
      junkRow({ 0: 'If any field is not relevant, use N/A (Not applicable).' }),
      junkRow({ 0: 'Do not insert or delete columns.' }),
      junkRow({ 0: 'Merged cells are not allowed.' }),
      junkRow(),
      junkRow({ 0: 'HORSE IF NEW PL', 1: 'NEW', 2: 'NEW' }),
      junkRow({ 0: 'Contact the PMO with questions.', 1: 'See the guide tab.' }),
      HEADERS,
      row({ 'PL Number': 'BUR01' }),
    ];
    expect(findHeaderRow(buried)).toBe(8);
    const [line] = parseFramingMatrix(buried, 'f.xlsx', []);
    expect(line.plNumber).toBe('BUR01');
  });

  it('does not false-positive on a row whose prose happens to include a couple of header-like words', () => {
    const withDecoy = [
      junkRow({ 0: 'PL Number', 1: 'Request type' }),
      HEADERS,
      row(),
    ];
    expect(findHeaderRow(withDecoy)).toBe(1);
  });

  it('returns -1 when no row has enough matches', () => {
    const noHeader = [
      junkRow(),
      junkRow({ 0: 'For a proper estimation, all fields are mandatory.' }),
      junkRow({ 0: 'HORSE IF NEW PL', 1: 'NEW', 2: 'NEW' }),
    ];
    expect(findHeaderRow(noHeader)).toBe(-1);
  });

  it('throws instead of yielding generated-PL garbage when only instruction rows are present — the regression this task exists for', () => {
    const onlyInstructions = [
      junkRow(),
      junkRow({ 0: 'For a proper estimation, all fields are mandatory.' }),
      junkRow({ 0: 'If any field is not relevant, use N/A (Not applicable).' }),
      junkRow({ 0: 'HORSE IF NEW PL', 1: 'NEW', 2: 'NEW' }),
    ];
    expect(() => parseFramingMatrix(onlyInstructions, 'f.xlsx', [])).toThrow(FramingParseError);
  });
});

describe('real-shape fixture (conformance P1/P2 regression guard, Task 3)', () => {
  const ANNUAL_VOLUME_FIELDS = [
    'annualVolumeSop', 'annualVolumeSopPlus1', 'annualVolumeSopPlus2',
    'annualVolumeSopPlus3', 'annualVolumeSopPlus4', 'annualVolumeSopPlus5',
    'annualVolumeSopPlus6',
  ] as const;
  const NON_FIELD_KEYS = new Set(['id', 'track', 'createdByFile', 'lastUpdatedByFile']);

  function countNonEmptyMappedFields(line: Record<string, unknown>): number {
    return Object.entries(line).filter(
      ([key, value]) => !NON_FIELD_KEYS.has(key) && value !== '' && value !== null,
    ).length;
  }

  it('locates the real header row at index 8, buried behind 8 instruction rows', () => {
    expect(findHeaderRow(REAL_SHAPE_MATRIX as unknown[][])).toBe(8);
  });

  it('parses both synthetic data rows into 2 lines', () => {
    const out = parseFramingMatrix(REAL_SHAPE_MATRIX as unknown[][], 'real-shape.xlsx', []);
    expect(out).toHaveLength(2);
    expect(out.map((l) => l.plNumber)).toEqual(['ZZ01', 'ZZ02']);
  });

  it('populates sopDate from SOP Date Powertrain — the P2 fix this fixture guards', () => {
    const [line] = parseFramingMatrix(REAL_SHAPE_MATRIX as unknown[][], 'real-shape.xlsx', []);
    expect(line.sopDate).toBe('2028-09-01');
  });

  it('populates all 7 annual volume fields', () => {
    const [line] = parseFramingMatrix(REAL_SHAPE_MATRIX as unknown[][], 'real-shape.xlsx', []);
    ANNUAL_VOLUME_FIELDS.forEach((field) => {
      expect((line as unknown as Record<string, unknown>)[field]).not.toBeNull();
    });
  });

  it('resolves at least 40 mapped fields to non-empty values for a real-shaped row', () => {
    const [line] = parseFramingMatrix(REAL_SHAPE_MATRIX as unknown[][], 'real-shape.xlsx', []);
    expect(countNonEmptyMappedFields(line as unknown as Record<string, unknown>))
      .toBeGreaterThanOrEqual(40);
  });

  it('round-trips through readFramingWorkbook + parseFramingMatrix from a real xlsx buffer', () => {
    const buffer = realShapeWorkbookBuffer();
    const { matrix } = readFramingWorkbook(buffer);
    const out = parseFramingMatrix(matrix, 'real-shape.xlsx', []);
    expect(out).toHaveLength(2);
    expect(out[0].sopDate).toBe('2028-09-01');
  });
});

describe('date parsing on a real-shaped row with week-code milestones (Task 8)', () => {
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const DATE_FIELDS = [
    'requestDate', 'rfqSendDate', 'vehicleMaDate', 'spDate', 'pcDate', 'coDate', 'sopDate',
  ] as const;

  it('parses every date-typed field to an ISO value an <input type="date"> can display', () => {
    const [line] = parseFramingMatrix(
      REAL_SHAPE_MATRIX_WEEK_CODES as unknown[][], 'real-shape-week-codes.xlsx', [],
    );
    DATE_FIELDS.forEach((field) => {
      expect(line[field]).toMatch(ISO_DATE_RE);
    });
  });

  it('resolves the week-code milestones in ascending order, matching the real file', () => {
    const [line] = parseFramingMatrix(
      REAL_SHAPE_MATRIX_WEEK_CODES as unknown[][], 'real-shape-week-codes.xlsx', [],
    );
    // requestDate=CW2520, rfqSendDate=CW2545, vehicleMaDate=CW2610,
    // sopDate=CW2635, spDate=CW2710, pcDate=CW2736 — assigned left to right
    // across the fixture's milestone columns in this ascending order.
    expect(line.requestDate < line.rfqSendDate).toBe(true);
    expect(line.rfqSendDate < line.vehicleMaDate).toBe(true);
    expect(line.vehicleMaDate < line.sopDate).toBe(true);
    expect(line.sopDate < line.spDate).toBe(true);
    expect(line.spDate < line.pcDate).toBe(true);
  });

  it('also parses the explicit dd-mm-yyyy contract date on the same row', () => {
    const [line] = parseFramingMatrix(
      REAL_SHAPE_MATRIX_WEEK_CODES as unknown[][], 'real-shape-week-codes.xlsx', [],
    );
    expect(line.coDate).toBe('2027-11-15');
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

  it('tags a missing GWF sheet with the noWorksheet code — I2', () => {
    const buf = workbook({ 'Data ref': [['x']], GWF_old: matrix(row()) });
    try {
      readFramingWorkbook(buf);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(FramingParseError);
      expect((err as FramingParseError).code).toBe('noWorksheet');
    }
  });
});

describe('parseFramingMatrix + startingCode (POC fill_xxxx_pl_numbers)', () => {
  it('gives every placeholder row its own code instead of collapsing them', () => {
    const rows = Array.from({ length: 5 }, () => row({ 'PL Number': 'to be open' }));
    const out = parseFramingMatrix(matrix(...rows), 'f.xlsx', [], 'IF01');
    expect(out.map((l) => l.plNumber)).toEqual(['IF01', 'IF02', 'IF03', 'IF04', 'IF05']);
  });

  it('overwrites codes the file already carried', () => {
    const out = parseFramingMatrix(
      matrix(row({ 'PL Number': 'IE59' }), row({ 'PL Number': 'New' })),
      'f.xlsx', [], 'IF01',
    );
    expect(out.map((l) => l.plNumber)).toEqual(['IF01', 'IF02']);
  });

  it('composes PL Name from the reassigned code, not the placeholder', () => {
    const [line] = parseFramingMatrix(matrix(row({ 'PL Number': 'New' })), 'f.xlsx', [], 'IF01');
    expect(line.plName.startsWith('IF01 ')).toBe(true);
    expect(line.plName).not.toContain('New');
  });

  it('rejects an invalid starting code before writing anything', () => {
    expect(() => parseFramingMatrix(matrix(row()), 'f.xlsx', [], 'New'))
      .toThrow(InvalidStartingPlNumberError);
  });

  it('keeps the §5.4 generate-only behaviour when no starting code is given', () => {
    const out = parseFramingMatrix(
      matrix(row({ 'PL Number': 'IE59' }), row({ 'PL Number': '' })),
      'f.xlsx', ['AA04'],
    );
    expect(out.map((l) => l.plNumber)).toEqual(['IE59', 'IE60']);
  });
});
