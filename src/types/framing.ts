/**
 * Framing File types — PRD §5.6 (cap_horse_great@origin/feature/framing-file-docs).
 * Field names are camelCase per this repo's convention; the PRD uses snake_case DB names.
 */

export type FramingTrack = 'RFQ' | 'RFI';

/**
 * Task 6 (HIW-452 remediation) — one entry per upload, so a bad upload can be
 * identified and undone. Mirrors the POC's file list
 * (1_Framing_File_Review.py:58-136), which our flat `lines` array otherwise
 * has no equivalent for.
 */
export interface FramingUpload {
  id: string;
  fileName: string;
  /** ISO timestamp. */
  uploadedAt: string;
  /** PL numbers this upload carried, as parsed — the store's ownership record. */
  plNumbers: string[];
}

/** Keys into FRAMING_REFERENCE (src/fixtures/framingReference.ts). */
export type RefListKey =
  | 'whyThisRequest'
  | 'cpoDepartment'
  | 'projectRanking'
  | 'activityType'
  | 'requestType'
  | 'hboRboRfqCms'
  | 'currentEcoMilestone'
  | 'expectedEcoOutput'
  | 'vehicleRange'
  | 'organType'
  | 'allianceCode'
  | 'drivetrain'
  | 'standardEmissions'
  | 'energy'
  | 'technoGroup'
  | 'cmo'
  | 'eeArchitecture'
  | 'countryCluster'
  | 'cpo'
  | 'cpa'
  | 'client';

export interface FramingLine {
  // ── identity & provenance (not form fields) ──────────────
  id: string;
  /** §15.1 — fixed at upload, never changes afterwards. */
  track: FramingTrack;
  /** §5.1 — `metier` (owner) source; required table column (HIW-460 AC#2). */
  ownerN2: string;
  /** §5.3 — PL Name component for M/B/GM rankings; defaults to 'MBTP' when empty. */
  activityType: string;
  createdByFile: string;
  lastUpdatedByFile: string;

  // ── §5.6.1 PL Details (13) ───────────────────────────────
  plNumber: string;
  /** Derived, read-only — §5.3. */
  plName: string;
  client: string;
  parentPlNumber: string;
  /** Derived, read-only — §5.5. */
  parentRanking: string;
  projectName: string;
  cpo: string;
  cpa: string;
  cpoDepartment: string;
  secondaryOrgan: string;
  thirdOrgan: string;
  fourthOrgan: string;
  otherSpecifications: string;

  // ── §5.6.2 Customer Request (23) ─────────────────────────
  requestType: string;
  requestDescription: string;
  requesterComment: string;
  whyThisRequest: string;
  requester: string;
  currentEcoMilestone: string;
  /** §15.1 — read-only in both tracks; drives classification. */
  expectedEcoOutput: string;
  requestDate: string;
  hboLeader: string;
  rfqSendDate: string;
  hboRboRfqCms: string;
  countryCluster: string;
  annualVolumeSop: number | null;
  annualVolumeSopPlus1: number | null;
  annualVolumeSopPlus2: number | null;
  annualVolumeSopPlus3: number | null;
  annualVolumeSopPlus4: number | null;
  annualVolumeSopPlus5: number | null;
  annualVolumeSopPlus6: number | null;
  vehicleMaDate: string;
  guaranteeCost: string;
  pimof: string;
  threeMis: string;

  // ── §5.6.3 Vehicle Description (7) ───────────────────────
  vehicleCode: string;
  vehicleBody: string;
  vehiclePhase: string;
  vehicleRange: string;
  cmo: string;
  drivetrain: string;
  vehicleFactory: string;

  // ── §5.6.4 Organ Description (8) ─────────────────────────
  organType: string;
  allianceCode: string;
  energy: string;
  standardEmissions: string;
  icePowerKw: number | null;
  iceTorqueNm: number | null;
  batteryCapacity: number | null;
  eeArchitecture: string;

  // ── §5.6.5 Schedule Milestones (4) ───────────────────────
  spDate: string;
  pcDate: string;
  coDate: string;
  sopDate: string;

  // ── §5.6.6 Framework (10) ────────────────────────────────
  projectRanking: string;
  frameworkComment: string;
  partFactory: string;
  cluster: string;
  technoGroup: string;
  protosPfc: number | null;
  protosVc: number | null;
  protosOrganPt: number | null;
  protosOrganUm: number | null;
  protosEp: number | null;

  // ── §5.6.8 Additional Details (1) ────────────────────────
  cvcNumber: string;
}

/** PRD §5.6: 13 + 23 + 7 + 8 + 4 + 10 + 0 + 1. */
export const FRAMING_FORM_FIELD_COUNT = 66;

export const EMPTY_FRAMING_LINE: FramingLine = {
  id: '',
  track: 'RFQ',
  ownerN2: '',
  activityType: '',
  createdByFile: '',
  lastUpdatedByFile: '',

  plNumber: '', plName: '', client: '', parentPlNumber: '', parentRanking: '',
  projectName: '', cpo: '', cpa: '', cpoDepartment: '', secondaryOrgan: '',
  thirdOrgan: '', fourthOrgan: '', otherSpecifications: '',

  requestType: '', requestDescription: '', requesterComment: '', whyThisRequest: '',
  requester: '', currentEcoMilestone: '', expectedEcoOutput: '', requestDate: '',
  hboLeader: '', rfqSendDate: '', hboRboRfqCms: '', countryCluster: '',
  annualVolumeSop: null, annualVolumeSopPlus1: null, annualVolumeSopPlus2: null,
  annualVolumeSopPlus3: null, annualVolumeSopPlus4: null, annualVolumeSopPlus5: null,
  annualVolumeSopPlus6: null,
  vehicleMaDate: '', guaranteeCost: '', pimof: '', threeMis: '',

  vehicleCode: '', vehicleBody: '', vehiclePhase: '', vehicleRange: '', cmo: '',
  drivetrain: '', vehicleFactory: '',

  organType: '', allianceCode: '', energy: '', standardEmissions: '',
  icePowerKw: null, iceTorqueNm: null, batteryCapacity: null, eeArchitecture: '',

  spDate: '', pcDate: '', coDate: '', sopDate: '',

  projectRanking: '', frameworkComment: '', partFactory: '', cluster: '', technoGroup: '',
  protosPfc: null, protosVc: null, protosOrganPt: null, protosOrganUm: null, protosEp: null,

  cvcNumber: '',
};
