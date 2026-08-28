import type { FramingLine, FramingTrack, RefListKey } from '../../types/framing';

export type FieldKind = 'text' | 'number' | 'date' | 'select' | 'derived' | 'parentRef';

export interface FramingFieldDef {
  key: keyof FramingLine;
  /** The PRD's own column name. Labels come from the schema, not i18n. */
  label: string;
  kind: FieldKind;
  /** Required when kind === 'select'; keys into FRAMING_REFERENCE. */
  refList?: RefListKey;
  /** §15.1 — expectedEcoOutput is read-only in both tracks. */
  readOnly?: boolean;
}

export interface FramingSectionDef {
  id: string;
  /** i18n key — section titles are translated; field labels are not. */
  labelKey: string;
  fields: FramingFieldDef[];
  /** §15.3 — rendered only on the RFI tab. */
  rfiOnly?: boolean;
}

const t = (key: keyof FramingLine, label: string): FramingFieldDef => ({ key, label, kind: 'text' });
const n = (key: keyof FramingLine, label: string): FramingFieldDef => ({ key, label, kind: 'number' });
const d = (key: keyof FramingLine, label: string): FramingFieldDef => ({ key, label, kind: 'date' });
const s = (key: keyof FramingLine, label: string, refList: RefListKey): FramingFieldDef =>
  ({ key, label, kind: 'select', refList });
const derived = (key: keyof FramingLine, label: string): FramingFieldDef =>
  ({ key, label, kind: 'derived' });

/** PRD §5.6 — the wp5 layout, section order and field order preserved. */
export const FRAMING_SECTIONS: FramingSectionDef[] = [
  {
    id: 'plDetails',
    labelKey: 'framing.section.plDetails',
    fields: [
      // C1 — plNumber keys `edits`, `dirtyFields`, the upload upsert map and
      // parent references. A file-carried PL Number is kept verbatim and an
      // empty one is auto-generated (§4.3/§5.4); nothing asks a user to type
      // one, so it is read-only rather than re-keyable from the form.
      { key: 'plNumber', label: 'PL Number', kind: 'text', readOnly: true },
      derived('plName', 'PL Name'),
      t('client', 'Customer'),
      { key: 'parentPlNumber', label: 'Parent Prog. Line', kind: 'parentRef' },
      derived('parentRanking', 'Parent Ranking'),
      t('projectName', 'Project Name'),
      s('cpo', 'CPO', 'cpo'),
      s('cpa', 'CPA', 'cpa'),
      s('cpoDepartment', 'CPO Department', 'cpoDepartment'),
      t('secondaryOrgan', 'Secondary Organ'),
      t('thirdOrgan', '3rd Organ'),
      t('fourthOrgan', '4th Organ'),
      t('otherSpecifications', 'Other Specifications'),
    ],
  },
  {
    id: 'customerRequest',
    labelKey: 'framing.section.customerRequest',
    fields: [
      s('requestType', 'Request type', 'requestType'),
      t('requestDescription', 'Request description'),
      t('requesterComment', 'Requester comment'),
      s('whyThisRequest', 'Why this Request', 'whyThisRequest'),
      t('requester', 'Requester'),
      s('currentEcoMilestone', 'Current ECO Milestone', 'currentEcoMilestone'),
      // §15.1 — drives RFI/RFQ classification, fixed at upload.
      { key: 'expectedEcoOutput', label: 'Expected ECO Output', kind: 'select',
        refList: 'expectedEcoOutput', readOnly: true },
      d('requestDate', 'Request date'),
      t('hboLeader', 'HBO Leader'),
      d('rfqSendDate', 'RFQ send date'),
      s('hboRboRfqCms', 'HBO / RBO RFQ/CMS', 'hboRboRfqCms'),
      s('countryCluster', 'Country Cluster', 'countryCluster'),
      n('annualVolumeSop', 'Annual volume SOP'),
      n('annualVolumeSopPlus1', 'Annual volume SOP+1'),
      n('annualVolumeSopPlus2', 'Annual volume SOP+2'),
      n('annualVolumeSopPlus3', 'Annual volume SOP+3'),
      n('annualVolumeSopPlus4', 'Annual volume SOP+4'),
      n('annualVolumeSopPlus5', 'Annual volume SOP+5'),
      n('annualVolumeSopPlus6', 'Annual volume SOP+6'),
      d('vehicleMaDate', 'Vehicle MA date'),
      t('guaranteeCost', 'Guarantee cost'),
      t('pimof', 'PIMOF'),
      t('threeMis', '3MIS'),
    ],
  },
  {
    id: 'vehicleDescription',
    labelKey: 'framing.section.vehicleDescription',
    fields: [
      t('vehicleCode', 'Vehicle code'),
      t('vehicleBody', 'Vehicle Body'),
      t('vehiclePhase', 'Vehicle Phase'),
      s('vehicleRange', 'Range', 'vehicleRange'),
      s('cmo', 'CMO', 'cmo'),
      s('drivetrain', '4X2 / 4X4', 'drivetrain'),
      t('vehicleFactory', 'Vehicle Factory'),
    ],
  },
  {
    id: 'organDescription',
    labelKey: 'framing.section.organDescription',
    fields: [
      s('organType', 'Part type', 'organType'),
      s('allianceCode', 'Alliance code', 'allianceCode'),
      s('energy', 'Fuel', 'energy'),
      s('standardEmissions', 'Standard emissions', 'standardEmissions'),
      n('icePowerKw', 'ICE Power kW'),
      n('iceTorqueNm', 'ICE Torque Nm'),
      n('batteryCapacity', 'Battery capacity'),
      s('eeArchitecture', 'EE Architecture', 'eeArchitecture'),
    ],
  },
  {
    id: 'scheduleMilestones',
    labelKey: 'framing.section.scheduleMilestones',
    fields: [
      d('spDate', 'Start of Project (SP)'),
      d('pcDate', 'Pre-contract date (PC)'),
      d('coDate', 'Contract date (CO/APR2)'),
      d('sopDate', 'Start of Production (SOP)'),
    ],
  },
  {
    id: 'framework',
    labelKey: 'framing.section.framework',
    fields: [
      s('projectRanking', 'Project ranking', 'projectRanking'),
      t('frameworkComment', 'Framework comment'),
      t('partFactory', 'Part Factory'),
      t('cluster', 'Cluster'),
      s('technoGroup', 'Techno Group', 'technoGroup'),
      n('protosPfc', '#Protos PFC'),
      n('protosVc', '#Protos VC'),
      n('protosOrganPt', '#Protos Organ PT'),
      n('protosOrganUm', '#Protos Organ UM'),
      n('protosEp', '#Protos EP'),
    ],
  },
  {
    // §5.6.7 — empty by design; the #Protos counts stay under Framework,
    // faithful to the wp5 layout.
    id: 'prototypeDetails',
    labelKey: 'framing.section.prototypeDetails',
    fields: [],
  },
  {
    id: 'additionalDetails',
    labelKey: 'framing.section.additionalDetails',
    fields: [t('cvcNumber', 'CVC Number')],
  },
  {
    // §15.3 — RFI-only section; its fields are undefined (FF-08).
    id: 'rfiDetails',
    labelKey: 'framing.section.rfiDetails',
    fields: [],
    rfiOnly: true,
  },
];

/** §15.3 — RFQ gets the 8 shared sections; RFI gets those plus its own. */
export function sectionsForTrack(track: FramingTrack): FramingSectionDef[] {
  return FRAMING_SECTIONS.filter((section) => !section.rfiOnly || track === 'RFI');
}

export function allFieldDefs(): FramingFieldDef[] {
  return FRAMING_SECTIONS.flatMap((section) => section.fields);
}
