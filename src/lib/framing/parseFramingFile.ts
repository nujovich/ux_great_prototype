import * as XLSX from 'xlsx';
import { EMPTY_FRAMING_LINE, type FramingLine } from '../../types/framing';
import { assignPlNumbers } from './plNumber';
import { composePlName } from './plName';
import { classifyLine } from './classify';
import {
  isDroppedRequestType, normalizeDrivetrain, normalizeKey,
  resolveClient, translateEnergy, translateOrganType,
} from './derive';

export class FramingParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FramingParseError';
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
 * The PRD names ~35 of the file's ~71 columns; the rest are descriptive and
 * unpersisted. When a real framing file appears, this map is the single place to
 * adjust — nothing else in the parser knows a header string.
 */
const RAW_HEADER_MAP: Record<string, keyof FramingLine> = {
  'PL Number': 'plNumber',
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

const ANNUAL_VOLUME_FIELDS: (keyof FramingLine)[] = [
  'annualVolumeSop', 'annualVolumeSopPlus1', 'annualVolumeSopPlus2',
  'annualVolumeSopPlus3', 'annualVolumeSopPlus4', 'annualVolumeSopPlus5',
  'annualVolumeSopPlus6',
];

/** `Annual volume SOP`, `Annual volume SOP+1` … `+6` map positionally (§5.6.2). */
function annualVolumeField(header: string): keyof FramingLine | null {
  const m = /^annual volume sop(?:\s*\+\s*(\d))?$/.exec(normalizeKey(header));
  if (!m) return null;
  const offset = m[1] ? Number(m[1]) : 0;
  return offset <= 6 ? ANNUAL_VOLUME_FIELDS[offset] : null;
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
 * §4.3 — pure parse-and-normalize over a 2-D matrix (row 0 = headers).
 * Runs ONLY the upload-time transforms; `engineering`, `estimateType`,
 * `injectionSystem` and `market` belong to Generate and GPMF export.
 */
export function parseFramingMatrix(
  matrix: unknown[][],
  fileName: string,
  existingCodes: readonly string[],
): FramingLine[] {
  const headerRow = matrix[0];
  if (!headerRow || headerRow.length === 0) {
    throw new FramingParseError('Framing sheet has no header row');
  }

  const columns = headerRow.map((raw) => {
    const header = toText(raw);
    return { header, field: HEADER_ALIASES[normalizeKey(header)] ?? annualVolumeField(header) };
  });

  const staged = matrix.slice(1).flatMap((cells, index) => {
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
  return assignPlNumbers(staged, knownCodes).map((line) => ({
    ...line,
    plName: composePlName(line),
  }));
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
      'No GWF* worksheet found (sheets ending in "old" are excluded)',
    );
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: '',
  });
  return { sheetName, matrix };
}
