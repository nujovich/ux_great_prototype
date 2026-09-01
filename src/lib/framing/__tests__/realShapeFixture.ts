import * as XLSX from 'xlsx';

/**
 * Reproduces the *shape* of a real framing file
 * (`01.- GWF2504 Framing File PWTD 20250305 v3 with 4 digits.xlsx`, sheet
 * `GWF2504`) without carrying any of its data — conformance report P1/P2,
 * remediation plan Task 3.
 *
 * The header row below is the real file's 72 header cells, verbatim,
 * embedded newlines included: that fidelity is what makes this fixture a
 * genuine regression guard rather than a restatement of the parser's own
 * aliases. Every other cell — instructions and data alike — is invented;
 * no vehicle code, CPO/CPA name, date or volume here comes from the real
 * file, which carries live project data that must never enter this repo.
 *
 * Header order and text taken from the conformance report's tables and from
 * `poc_great/src/backend/demo_list.py`'s `group_1` … `group_6`.
 */
export const REAL_SHAPE_HEADER_ROW: readonly string[] = [
  'Creation process',
  'Request date',
  'Requester',
  'PL Number',
  'Project name',
  'GPS NAME',
  'Request description,\r\n - to explain content to H\r\n-  to incl. Vehicle evolutions or main ET  inductors',
  'Why this Request',
  'Requester comment',
  'Project ranking',
  'Request type',
  'Vehicle code',
  'Vehicle Body',
  'Vehicle Phase',
  'HBO Leader',
  'Date envoi RFQ',
  'HBO / RBO RFQ/CMS',
  'CURRENT ECO MILESTONE',
  'EXPECTED \r\nECO OUTPUT',
  'Parent\r\n Prog. Line',
  'Parent ranking',
  'Vehicle \r\nRange',
  'Part type',
  'Alliance code',
  'Secondary Organ',
  '3rd Organ',
  '4th Organ',
  'Other Specifications',
  '4X2 / 4X4',
  'Standard emissions',
  'Fuel',
  'Battery Capacity',
  'ICE\r\nPower (kW)',
  'ICE\r\nTorque\r\n(N.m)',
  'CMO',
  'EE Architecture',
  'Country Cluster',
  'Partner',
  '% Partner',
  'Market',
  'Veh factory',
  'Vehicle MA',
  'SOP Date Powertrain',
  'Annual volume - SOP',
  'Annual volume - SOP+1',
  'Annual volume - SOP+2 ',
  'Annual volume - SOP+3',
  'Annual volume - SOP+4',
  'Annual volume - SOP+5',
  'Annual volume - SOP+6',
  'CPO',
  'CPA',
  'Start of Project (SP)',
  'Pre-contract date (PC)',
  'Contract date (CO/APR2)\r\nCO',
  'ABVC Date',
  'ABPT Date',
  'MA Date (MA/APR3)MA',
  'Framework comment',
  'Framework - Technical Definition',
  'Framework - Prototype',
  '#Protos PFC',
  '#Protos EP (Engineering Prototypes - LEAP100)',
  '#Protos VC',
  '#Protos Organ PT',
  '#Protos Organ UM',
  'Framework - DIPM',
  'Framework - Tuning + EMS',
  '3MIS (K‰)\r\nif different of AnnualQ target sent by RG Quality  to H',
  'Guarantee cost (€/vh\r\nif different of AnnualQ target sent by RG Quality  to H',
  'PIMOF (K‰)\r\nif different of AnnualQ target sent by RG Quality  to H',
  'LP exitante dans PGM',
];

// Eight leading rows of instructions to whoever fills the file in — invented
// boilerplate, shaped (blank / sparse / prose) like the real file's own
// leading rows, but not copied from it.
export const REAL_SHAPE_INSTRUCTION_ROWS: readonly unknown[][] = [
  Array(72).fill(''),
  ['FRAMING FILE — FICTIONAL TEMPLATE FOR TESTING PURPOSES ONLY', ...Array(71).fill('')],
  [
    'For a proper estimation, all fields are mandatory.',
    'See the guide tab for field definitions.',
    'Do not insert or delete columns.',
    ...Array(69).fill(''),
  ],
  [
    'If a field is not relevant, use N/A (Not applicable).',
    'Contact the PMO with questions.',
    'Values are not case-sensitive.',
    ...Array(69).fill(''),
  ],
  [
    'Merged cells are not allowed.',
    'Save as .xlsx before sending.',
    'One row per PL Number.',
    ...Array(69).fill(''),
  ],
  ['Template version: fixture-1', ...Array(71).fill('')],
  [
    'SAMPLE',
    'NEW',
    'NEW',
    'NEW',
    ...Array(68).fill(''),
  ],
  [
    'Row shown below is illustrative only.',
    'Replace with your own data.',
    ...Array(70).fill(''),
  ],
];

const dataRow = (overrides: Record<number, unknown>): unknown[] => {
  const cells: unknown[] = Array(72).fill('');
  Object.entries(overrides).forEach(([index, value]) => {
    cells[Number(index)] = value;
  });
  return cells;
};

// Column indices mirror REAL_SHAPE_HEADER_ROW above, 1:1.
export const REAL_SHAPE_DATA_ROW_1: readonly unknown[] = dataRow({
  0: 'GWF',
  1: '3/10/26',
  2: 'A. Example',
  3: 'ZZ01',
  4: 'Synthetic Project Alpha',
  5: 'GPS-ALPHA',
  6: 'Synthetic request description for fixture testing purposes only.',
  7: 'Regulation',
  8: 'Synthetic requester comment.',
  9: 'M',
  10: 'Creation',
  11: 'ZZ99',
  12: 'P',
  13: "Ph1'",
  14: 'J. Fixture',
  15: '3/12/26',
  16: 'RFQ',
  17: 'ECO1',
  18: 'ECO2',
  19: 'ZZ00',
  20: 'MBTP',
  21: 'C',
  22: 'Moteur thermique',
  23: 'ZZ10TESTG1',
  24: 'SO-1',
  25: 'TO-1',
  26: 'FO-1',
  27: 'None',
  28: '4x4',
  29: 'ZZ01',
  30: 'Essence',
  31: '',
  32: '90',
  33: '250',
  34: 'TST-PLATFORM',
  35: 'TST-ARCH',
  36: 'CE01B - Europe Western & German Speaking',
  37: '',
  38: '',
  39: '',
  40: 'Synthetic Factory',
  41: '2028-06-01',
  42: '2028-09-01',
  43: '1000',
  44: '1200',
  45: '1300',
  46: '1400',
  47: '1500',
  48: '1600',
  49: '1700',
  50: 'A. CpoExample',
  51: 'B. CpaExample',
  52: '2026-01-01',
  53: '2026-06-01',
  54: '2027-01-01',
  55: '2027-02-01',
  56: '2027-03-01',
  57: '', // MA Date left blank — proves sopDate below traces to SOP Date Powertrain
  58: 'Synthetic framework comment.',
  59: '',
  60: '',
  61: '2',
  62: '3',
  63: '1',
  64: '1',
  65: '1',
  66: '',
  67: '',
  68: '12.5',
  69: '450',
  70: '7.1',
  71: '',
});

export const REAL_SHAPE_DATA_ROW_2: readonly unknown[] = dataRow({
  0: 'GWF',
  1: '3/14/26',
  2: 'C. Sample',
  3: 'ZZ02',
  4: 'Synthetic Project Beta',
  5: 'GPS-BETA',
  6: 'Another synthetic request description for fixture testing.',
  7: 'Profitability',
  8: 'Another synthetic requester comment.',
  9: 'B',
  10: 'Creation',
  11: 'ZZ98',
  12: 'S',
  13: 'PH2',
  14: 'K. Fixture',
  15: '3/16/26',
  16: 'CMS',
  17: 'ECO0 / MGMT / LEGISLATION',
  18: 'ECO3',
  19: 'ZZ01',
  20: 'CPU',
  21: 'D-E',
  22: 'Batterie',
  23: 'ZZ11TESTG2',
  24: 'SO-2',
  25: 'TO-2',
  26: 'FO-2',
  27: 'None',
  28: '4x2',
  29: 'ZZ02',
  30: 'Electrique',
  31: '75',
  32: '',
  33: '',
  34: 'TST-PLATFORM-2',
  35: 'TST-ARCH-2',
  36: 'CE02B - Europe Balkans & DOM',
  37: '',
  38: '',
  39: '',
  40: 'Synthetic Factory Two',
  41: '2029-01-01',
  42: '2029-03-01',
  43: '2000',
  44: '2100',
  45: '2200',
  46: '2300',
  47: '2400',
  48: '2500',
  49: '2600',
  50: 'D. CpoSample',
  51: 'E. CpaSample',
  52: '2026-02-01',
  53: '2026-07-01',
  54: '2027-02-01',
  55: '2027-03-01',
  56: '2027-04-01',
  57: '',
  58: 'Second synthetic framework comment.',
  59: '',
  60: '',
  61: '1',
  62: '2',
  63: '1',
  64: '0',
  65: '1',
  66: '',
  67: '',
  68: '9.0',
  69: '380',
  70: '5.5',
  71: '',
});

/** 8 instruction rows, the real header row at index 8, and 2 synthetic data rows. */
export const REAL_SHAPE_MATRIX: unknown[][] = [
  ...REAL_SHAPE_INSTRUCTION_ROWS.map((r) => [...r]),
  [...REAL_SHAPE_HEADER_ROW],
  [...REAL_SHAPE_DATA_ROW_1],
  [...REAL_SHAPE_DATA_ROW_2],
];

/**
 * Week-code variant (remediation plan Task 8) — REAL_SHAPE_DATA_ROW_1/2
 * above carry milestone dates already in ISO, so they exercise only rule 5's
 * pass-through. This row carries the real file's own milestone shape —
 * calendar-week codes, e.g. `CW2736` — across the milestone columns, so the
 * week-code parsing path is genuinely exercised end to end. Codes are the
 * six the conformance review found in the real file's data row, assigned
 * left to right across the milestone columns in ascending order, matching
 * their chronological progression there. `Contract date` uses a `dd-mm-yyyy`
 * value instead, so this one row also exercises the explicit-format branch.
 */
export const REAL_SHAPE_DATA_ROW_WEEK_CODES: readonly unknown[] = dataRow({
  0: 'GWF',
  1: 'CW2520', // Request date
  2: 'W. Example',
  3: 'ZZ03',
  4: 'Synthetic Project Gamma',
  5: 'GPS-GAMMA',
  6: 'Synthetic request description for the week-code fixture row.',
  7: 'Regulation',
  8: 'Synthetic requester comment.',
  9: 'M',
  10: 'Creation',
  11: 'ZZ97',
  12: 'P',
  13: "Ph1'",
  14: 'W. Fixture',
  15: 'CW2545', // Date envoi RFQ
  16: 'RFQ',
  17: 'ECO1',
  18: 'ECO2',
  19: 'ZZ00',
  20: 'MBTP',
  21: 'C',
  22: 'Moteur thermique',
  23: 'ZZ12TESTG3',
  24: 'SO-3',
  25: 'TO-3',
  26: 'FO-3',
  27: 'None',
  28: '4x4',
  29: 'ZZ01',
  30: 'Essence',
  31: '',
  32: '90',
  33: '250',
  34: 'TST-PLATFORM-3',
  35: 'TST-ARCH-3',
  36: 'CE01B - Europe Western & German Speaking',
  37: '',
  38: '',
  39: '',
  40: 'Synthetic Factory Three',
  41: 'CW2610', // Vehicle MA
  42: 'CW2635', // SOP Date Powertrain
  43: '1000',
  44: '1200',
  45: '1300',
  46: '1400',
  47: '1500',
  48: '1600',
  49: '1700',
  50: 'W. CpoExample',
  51: 'X. CpaExample',
  52: 'CW2710', // Start of Project (SP)
  53: 'CW2736', // Pre-contract date (PC)
  54: '15-11-2027', // Contract date (CO/APR2) CO — exercises the explicit dd-mm-yyyy branch
  55: '',
  56: '',
  57: '', // MA Date left blank — sopDate traces to SOP Date Powertrain, as in row 1
  58: 'Synthetic framework comment for the week-code fixture row.',
  59: '',
  60: '',
  61: '2',
  62: '3',
  63: '1',
  64: '1',
  65: '1',
  66: '',
  67: '',
  68: '12.5',
  69: '450',
  70: '7.1',
  71: '',
});

/**
 * The header row, instruction rows and a single week-code data row —
 * a smaller, purpose-built matrix for the date-parsing end-to-end test so it
 * doesn't have to share REAL_SHAPE_MATRIX's fixed 2-row expectations.
 */
export const REAL_SHAPE_MATRIX_WEEK_CODES: unknown[][] = [
  ...REAL_SHAPE_INSTRUCTION_ROWS.map((r) => [...r]),
  [...REAL_SHAPE_HEADER_ROW],
  [...REAL_SHAPE_DATA_ROW_WEEK_CODES],
];

/** Wraps REAL_SHAPE_MATRIX into a one-sheet .xlsx workbook buffer for readFramingWorkbook. */
export function realShapeWorkbookBuffer(sheetName = 'GWF2504'): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(REAL_SHAPE_MATRIX as unknown[][]);
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
