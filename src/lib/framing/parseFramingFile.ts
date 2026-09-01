import * as XLSX from 'xlsx';
import { EMPTY_FRAMING_LINE, type FramingLine } from '../../types/framing';
import { assertStartingPlNumber, assignPlNumbers, reassignPlNumbers } from './plNumber';
import { composePlName } from './plName';
import { classifyLine } from './classify';
import { allFieldDefs } from './sections';
import { parseCustomDate } from './dates';
import {
  isDroppedRequestType, normalizeDrivetrain, normalizeKey,
  resolveClient, translateEnergy, translateOrganType,
} from './derive';

/**
 * I2 — the two parse failures the UI must tell apart, each with its own i18n
 * key. Anything else (corrupt/encrypted workbook, etc.) is a plain Error and
 * gets a distinct generic fallback in the component — never one of these two
 * translated messages.
 */
export type FramingParseErrorCode = 'noWorksheet' | 'noHeaderRow';

export class FramingParseError extends Error {
  readonly code: FramingParseErrorCode;

  constructor(message: string, code: FramingParseErrorCode) {
    super(message);
    this.name = 'FramingParseError';
    this.code = code;
  }
}

/** §4.1 — one .xlsx per upload; any other extension is rejected before parsing. */
export function isXlsxFileName(name: string): boolean {
  return /\.xlsx$/i.test((name ?? '').trim());
}

/** §4.2 — first `^GWF.*` sheet, excluding any name ending in `old`. */
export function selectFramingSheet(sheetNames: string[]): string | null {
  return (
    sheetNames.find((raw) => {
      const name = (raw ?? '').trim();
      return /^GWF/i.test(name) && !/old$/i.test(name);
    }) ?? null
  );
}

/**
 * Framing header → FramingLine field. Keys are normalizeKey()-folded, so callers
 * get case-, accent- and whitespace-insensitive matching for free.
 *
 * Built from the PRD's ~35 quoted column names, then extended against the real
 * file in `poc_great/data/` (conformance report P2) — a real header may use
 * either spelling, so both stay here. Nothing else in the parser knows a
 * header string.
 */
const RAW_HEADER_MAP: Record<string, keyof FramingLine> = {
  'PL Number': 'plNumber',
  // Real-file spellings (conformance P2) that differ from the PRD's names above.
  'SOP Date Powertrain': 'sopDate',
  'Date envoi RFQ': 'rfqSendDate',
  'Vehicle Range': 'vehicleRange',
  'ICE Power (kW)': 'icePowerKw',
  'ICE Torque (N.m)': 'iceTorqueNm',
  'Vehicle MA': 'vehicleMaDate',
  'Veh factory': 'vehicleFactory',
  '#Protos EP (Engineering Prototypes - LEAP100)': 'protosEp',
  'Part factory': 'partFactory',
  'Request type': 'requestType',
  'Request description': 'requestDescription',
  'Requester comment': 'requesterComment',
  'Why this Request': 'whyThisRequest',
  Requester: 'requester',
  'CURRENT ECO MILESTONE': 'currentEcoMilestone',
  'EXPECTED ECO OUTPUT': 'expectedEcoOutput',
  'Request date': 'requestDate',
  'HBO Leader': 'hboLeader',
  'RFQ send date': 'rfqSendDate',
  'HBO / RBO RFQ/CMS': 'hboRboRfqCms',
  'Country Cluster': 'countryCluster',
  'Vehicle MA date': 'vehicleMaDate',
  'Guarantee cost': 'guaranteeCost',
  PIMOF: 'pimof',
  '3MIS': 'threeMis',
  'Project Name': 'projectName',
  CPO: 'cpo',
  CPA: 'cpa',
  'CPO Department': 'cpoDepartment',
  'Secondary Organ': 'secondaryOrgan',
  '3rd Organ': 'thirdOrgan',
  '4th Organ': 'fourthOrgan',
  'Other Specifications': 'otherSpecifications',
  'Parent Prog. Line': 'parentPlNumber',
  'Vehicle code': 'vehicleCode',
  'Vehicle Body': 'vehicleBody',
  'Vehicle Phase': 'vehiclePhase',
  Range: 'vehicleRange',
  CMO: 'cmo',
  '4X2 / 4X4': 'drivetrain',
  'Vehicle Factory': 'vehicleFactory',
  'Alliance code': 'allianceCode',
  'Standard emissions': 'standardEmissions',
  'ICE Power kW': 'icePowerKw',
  'ICE Torque Nm': 'iceTorqueNm',
  'Battery capacity': 'batteryCapacity',
  'EE Architecture': 'eeArchitecture',
  'Start of Project (SP)': 'spDate',
  'Pre-contract date (PC)': 'pcDate',
  'Contract date (CO/APR2) CO': 'coDate',
  'Start of Production (SOP)': 'sopDate',
  'MA Date (MA/APR3)MA': 'sopDate',
  'Project ranking': 'projectRanking',
  'Framework comment': 'frameworkComment',
  'Part Factory': 'partFactory',
  Cluster: 'cluster',
  'Techno Group': 'technoGroup',
  '#Protos PFC': 'protosPfc',
  '#Protos VC': 'protosVc',
  '#Protos Organ PT': 'protosOrganPt',
  '#Protos Organ UM': 'protosOrganUm',
  '#Protos EP': 'protosEp',
  'CVC Number': 'cvcNumber',
  'Owner N2': 'ownerN2',
  'Activity type': 'activityType',
  // Sources consumed by derivation rather than stored directly.
  'Part type': 'organType',
  Fuel: 'energy',
};

export const HEADER_ALIASES: Record<string, keyof FramingLine> = Object.fromEntries(
  Object.entries(RAW_HEADER_MAP).map(([header, field]) => [normalizeKey(header), field]),
);

const NUMERIC_FIELDS = new Set<keyof FramingLine>([
  'annualVolumeSop', 'annualVolumeSopPlus1', 'annualVolumeSopPlus2',
  'annualVolumeSopPlus3', 'annualVolumeSopPlus4', 'annualVolumeSopPlus5',
  'annualVolumeSopPlus6', 'icePowerKw', 'iceTorqueNm', 'batteryCapacity',
  'protosPfc', 'protosVc', 'protosOrganPt', 'protosOrganUm', 'protosEp',
]);

/**
 * §5.1 — every milestone is "Parsed to date (week-code / dd-mm-yyyy
 * tolerant)". Derived from sections.ts's own `kind: 'date'` fields rather
 * than duplicated here, so the two can't drift.
 */
const DATE_FIELDS = new Set<keyof FramingLine>(
  allFieldDefs().filter((def) => def.kind === 'date').map((def) => def.key),
);

const ANNUAL_VOLUME_FIELDS: (keyof FramingLine)[] = [
  'annualVolumeSop', 'annualVolumeSopPlus1', 'annualVolumeSopPlus2',
  'annualVolumeSopPlus3', 'annualVolumeSopPlus4', 'annualVolumeSopPlus5',
  'annualVolumeSopPlus6',
];

/**
 * `Annual volume SOP`, `Annual volume SOP+1` … `+6` map positionally (§5.6.2).
 * The real file spells this `Annual volume - SOP…` (conformance P2) — the
 * hyphen is optional so both forms resolve.
 */
function annualVolumeField(header: string): keyof FramingLine | null {
  const m = /^annual volume\s*-?\s*sop(?:\s*\+\s*(\d))?$/.exec(normalizeKey(header));
  if (!m) return null;
  const offset = m[1] ? Number(m[1]) : 0;
  return offset <= 6 ? ANNUAL_VOLUME_FIELDS[offset] : null;
}

/**
 * Four real headers (conformance P2) carry a long explanatory tail after an
 * embedded newline, which normalizeKey collapses into the row rather than
 * stripping — so they're matched by prefix instead of the full string.
 * Checked only after the exact-alias lookup misses, so a short-form header
 * (e.g. plain `Guarantee cost`) is never shadowed by its long-form cousin.
 */
const HEADER_PREFIX_ALIASES: readonly (readonly [string, keyof FramingLine])[] = [
  ['3mis (k', 'threeMis'],
  ['guarantee cost (', 'guaranteeCost'],
  ['pimof (k', 'pimof'],
  ['request description,', 'requestDescription'],
];

function prefixMatchedField(normalizedHeader: string): keyof FramingLine | null {
  const hit = HEADER_PREFIX_ALIASES.find(([prefix]) => normalizedHeader.startsWith(prefix));
  return hit ? hit[1] : null;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function toNumber(value: unknown): number | null {
  const text = toText(value);
  if (text === '') return null;
  const n = Number(text.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Header → field. Exact alias match first, then the prefix step for headers
 * with a long explanatory tail, then the annual-volume pattern — in that
 * order, so an exact match always wins.
 */
function resolveHeaderField(header: string): keyof FramingLine | undefined {
  const normalized = normalizeKey(header);
  return (
    HEADER_ALIASES[normalized] ?? prefixMatchedField(normalized) ?? annualVolumeField(header)
    ?? undefined
  );
}

const HEADER_ROW_SCAN_LIMIT = 20;
const HEADER_ROW_MATCH_THRESHOLD = 5;

function countHeaderMatches(row: unknown[] | undefined): number {
  if (!row) return 0;
  return row.reduce<number>(
    (count, raw) => (resolveHeaderField(toText(raw)) ? count + 1 : count),
    0,
  );
}

/**
 * P1 — real framing sheets bury the header row behind rows of instructions to
 * whoever fills the file in; `matrix[0]` is not a safe assumption. Scans the
 * first 20 rows and returns the first one with at least
 * HEADER_ROW_MATCH_THRESHOLD cells resolving to a known field.
 *
 * A row narrower than the threshold — a hand-built fixture, never a real ~70
 * column sheet — can mathematically never reach it, so among *those* rows the
 * best nonzero-scoring one in range is accepted instead. A realistic-width
 * row (>= the threshold) never qualifies for that exception, so it does not
 * weaken the guard against a real file's instruction rows.
 */
export function findHeaderRow(matrix: unknown[][]): number {
  const limit = Math.min(matrix.length, HEADER_ROW_SCAN_LIMIT);
  let bestIndex = -1;
  let bestScore = 0;
  for (let i = 0; i < limit; i += 1) {
    const candidate = matrix[i];
    const score = countHeaderMatches(candidate);
    if (score >= HEADER_ROW_MATCH_THRESHOLD) return i;
    if (candidate && candidate.length < HEADER_ROW_MATCH_THRESHOLD && score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/**
 * §4.3 — pure parse-and-normalize over a 2-D matrix. The header row is
 * located by `findHeaderRow` rather than assumed to be row 0 (P1) — real
 * sheets bury it behind instruction rows. Runs ONLY the upload-time
 * transforms; `engineering`, `estimateType`, `injectionSystem` and `market`
 * belong to Generate and GPMF export.
 *
 * `startingCode` selects the PL Number strategy. With one (the POC's
 * "Starting PL Number", what the upload UI always supplies) every row is
 * reassigned from it; without one, §5.4's generate-only rule applies. The
 * validity check runs before any row is parsed, so a bad code costs nothing.
 */
export function parseFramingMatrix(
  matrix: unknown[][],
  fileName: string,
  existingCodes: readonly string[],
  startingCode?: string,
): FramingLine[] {
  // Fail before parsing — an invalid starting code must not half-ingest a file.
  if (startingCode !== undefined) assertStartingPlNumber(startingCode);
  const headerRowIndex = findHeaderRow(matrix);
  if (headerRowIndex === -1) {
    throw new FramingParseError('Framing sheet has no header row', 'noHeaderRow');
  }
  const headerRow = matrix[headerRowIndex];

  const columns = headerRow.map((raw) => {
    const header = toText(raw);
    return { header, field: resolveHeaderField(header) };
  });

  const staged = matrix.slice(headerRowIndex + 1).flatMap((cells, index) => {
    if (!cells || cells.every((c) => toText(c) === '')) return [];

    const line: FramingLine = { ...EMPTY_FRAMING_LINE };
    let rawCustomer = '';
    let rawClient = '';

    columns.forEach(({ header, field }, col) => {
      const cell = cells[col];
      const normalized = normalizeKey(header);
      if (normalized === 'customer') rawCustomer = toText(cell);
      if (normalized === 'client') rawClient = toText(cell);
      if (!field) return;
      const record = line as unknown as Record<string, unknown>;
      if (NUMERIC_FIELDS.has(field)) {
        const value = toNumber(cell);
        // Never let an empty cell clobber a value already written by an earlier
        // duplicate-mapped header (e.g. `sopDate` is aliased from both
        // `Start of Production (SOP)` and `MA Date (MA/APR3)MA` — an alternate
        // source, not a positional override).
        if (value !== null || record[field] == null) record[field] = value;
      } else if (DATE_FIELDS.has(field)) {
        // Same anti-clobber rule as NUMERIC_FIELDS above, applied to dates —
        // `sopDate` in particular is aliased from two headers.
        const parsed = parseCustomDate(cell);
        if (parsed !== null || !record[field]) record[field] = parsed ?? '';
      } else {
        const value = toText(cell);
        if (value !== '' || !record[field]) record[field] = value;
      }
    });

    // §4.3 — drop before anything else is derived.
    if (isDroppedRequestType(line.requestType)) return [];

    line.id = `ffl-${index}-${Math.random().toString(36).slice(2, 9)}`;
    line.organType = translateOrganType(line.organType);
    line.energy = translateEnergy(line.energy);
    line.client = resolveClient(rawCustomer, rawClient);
    line.drivetrain = normalizeDrivetrain(line.drivetrain);
    line.track = classifyLine(line.expectedEcoOutput);
    line.createdByFile = fileName;
    line.lastUpdatedByFile = fileName;
    return [line];
  });

  // §5.4 then §5.3 — PL Name needs the resolved PL Number.
  //
  // assignPlNumbers only looks at existingCodes (persisted rows) to find each
  // format family's highest code — it never sees codes carried by other rows in
  // THIS file. A file with row A = 'AA50' and row B = '' would otherwise assign
  // B the code 'AA00', and because upload upserts on PL Number, B would silently
  // overwrite A. Folding the file's own non-empty codes into the known set fixes
  // that without touching assignPlNumbers itself.
  const knownCodes = [
    ...existingCodes,
    ...staged.map((r) => r.plNumber).filter((c) => c !== ''),
  ];
  const coded = startingCode === undefined
    ? assignPlNumbers(staged, knownCodes)
    : reassignPlNumbers(staged, startingCode, existingCodes);
  return coded.map((line) => ({
    ...line,
    plName: composePlName(line),
  }));
}

/**
 * How many rows of `ws` actually carry a cell.
 *
 * Every real framing file declares its sheet as the whole 1,048,576-row grid
 * while holding a few hundred cells, and `sheet_to_json` with `defval: ''`
 * honours the declaration — 40-60 seconds per file to materialize a million
 * rows of empty strings, which in the browser is a frozen tab on every upload.
 * Scanning the cell keys is O(cells), not O(declared rows).
 *
 * The bound is the last row with a *cell*, not the last with a value: a
 * trailing style-only cell costs one skipped row, whereas guessing wrong about
 * emptiness could drop a real one. `parseFramingMatrix` discards blank rows.
 */
export function usedRowCount(ws: XLSX.WorkSheet): number {
  let lastRow = -1;
  for (const key of Object.keys(ws)) {
    if (key.startsWith('!')) continue;
    const { r } = XLSX.utils.decode_cell(key);
    if (r > lastRow) lastRow = r;
  }
  return lastRow + 1;
}

/**
 * `sheet_to_json` options that clamp its row range to `usedRowCount`, or none
 * when there is nothing to clamp (no declared range, or an empty sheet — where
 * the default already does the right thing).
 */
function boundedRange(ws: XLSX.WorkSheet): { range?: XLSX.Range } {
  const declared = ws['!ref'];
  const rowCount = usedRowCount(ws);
  if (declared === undefined || rowCount === 0) return {};
  const range = XLSX.utils.decode_range(declared);
  return { range: { ...range, e: { ...range.e, r: Math.min(range.e.r, rowCount - 1) } } };
}

/** §4.2 — the only function here that touches SheetJS. */
export function readFramingWorkbook(buffer: ArrayBuffer): {
  sheetName: string;
  matrix: unknown[][];
} {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = selectFramingSheet(wb.SheetNames);
  if (!sheetName) {
    throw new FramingParseError(
      'No GWF worksheet found (sheets ending in "old" are excluded)',
      'noWorksheet',
    );
  }
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    ...boundedRange(sheet),
  });
  return { sheetName, matrix };
}
