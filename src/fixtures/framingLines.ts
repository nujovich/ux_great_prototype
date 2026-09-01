import { EMPTY_FRAMING_LINE, type FramingLine } from '../types/framing';
import { composePlName } from '../lib/framing/plName';
import { classifyLine } from '../lib/framing/classify';

const SEED_FILE = 'framing-2026-08.xlsx';

/** Fills provenance, then derives `track` and `plName` so the seed cannot drift. */
function line(id: string, over: Partial<FramingLine>): FramingLine {
  const base: FramingLine = {
    ...EMPTY_FRAMING_LINE,
    id,
    createdByFile: SEED_FILE,
    lastUpdatedByFile: SEED_FILE,
    ...over,
  };
  return { ...base, track: classifyLine(base.expectedEcoOutput), plName: composePlName(base) };
}

export const FRAMING_LINES: FramingLine[] = [
  line('ffl-seed-1', {
    plNumber: 'AA00', client: 'RG', ownerN2: 'H-DESIGN', activityType: 'MBTP',
    projectRanking: 'M', organType: 'Gearbox', energy: 'Diesel',
    allianceCode: 'HR10DDTG2', vehicleCode: 'X67', standardEmissions: 'E06C',
    secondaryOrgan: 'SO1', drivetrain: '4X2', vehiclePhase: 'PH1',
    expectedEcoOutput: 'ECO2', technoGroup: 'Diesel PWT', partFactory: 'BARI (Getrag)',
    cluster: 'CL-01', frameworkComment: 'Baseline gearbox request',
    projectName: 'X67 Gearbox uplift', cpo: 'B. Hernandez', cpa: 'K. Shway',
    cpoDepartment: 'H-Project', requestType: 'Creation', whyThisRequest: 'Regulation',
    currentEcoMilestone: 'ECO1', countryCluster: 'CE01B - Europe Western & German Speaking',
    vehicleRange: 'C', cmo: 'CMF-B', eeArchitecture: 'C1A',
    spDate: '2027-01-11', pcDate: '2027-03-01', coDate: '2027-06-01', sopDate: '2028-09-01',
    annualVolumeSop: 12000, annualVolumeSopPlus1: 18000,
    protosPfc: 3, protosVc: 2, cvcNumber: '2608',
  }),
  line('ffl-seed-2', {
    plNumber: 'AA01', client: 'RG', ownerN2: 'H-SOFTWARE', activityType: 'CPU',
    projectRanking: 'C93W', organType: 'Battery', energy: 'Electric',
    allianceCode: 'AR18DEG2', vehicleCode: 'X82', standardEmissions: 'E07R',
    secondaryOrgan: 'SO2', drivetrain: '4X4', vehiclePhase: 'PH2',
    expectedEcoOutput: 'ECO1', technoGroup: 'PHEV PWT', partFactory: 'Magna Nanchang',
    cluster: 'CL-02', frameworkComment: 'Child line, battery SW',
    parentPlNumber: 'AA00', parentRanking: 'M',
    projectName: 'X82 battery SW', requestType: 'Modification',
    spDate: '2027-02-01', coDate: '2027-07-01', sopDate: '2028-11-01',
  }),
  line('ffl-seed-3', {
    plNumber: '00AA', client: 'Nissan', ownerN2: 'H-TUNING', activityType: 'MBPU',
    projectRanking: 'B', organType: 'Thermal Engine', energy: 'Gasoline',
    allianceCode: 'HR12DDTG1', vehicleCode: 'JX16', standardEmissions: 'E06R',
    drivetrain: '4X2', expectedEcoOutput: 'ECO3', technoGroup: 'Gasoline PWT',
    partFactory: 'Shizuoka', cluster: 'CL-03', frameworkComment: 'Nissan tuning scope',
    projectName: 'JX16 tuning', requestType: 'Creation',
    spDate: '2027-04-01', pcDate: '2027-05-15', coDate: '2027-09-01', sopDate: '2029-01-01',
  }),
  line('ffl-seed-4', {
    plNumber: '01AA', client: 'Dacia', ownerN2: 'H-CUSTOMER', activityType: 'I4I',
    projectRanking: 'GM', organType: 'Electric Engine', energy: 'Hybrid - Gasoline',
    allianceCode: 'HR16DEG2', vehicleCode: 'DX15', standardEmissions: 'E05A',
    drivetrain: '4X4', expectedEcoOutput: 'ECO2', technoGroup: 'HEV PWT',
    partFactory: 'Cordoba', cluster: 'CL-04', frameworkComment: 'Hybrid e-engine',
    projectName: 'DX15 hybrid', requestType: 'Creation',
    spDate: '2027-06-01', pcDate: '2027-08-01', coDate: '2027-11-01', sopDate: '2029-03-01',
  }),
  // §15.1 — empty and N/A both classify RFI.
  line('ffl-seed-5', {
    plNumber: 'AA02', client: 'RG', ownerN2: 'H-DESIGN', activityType: 'R&AE',
    projectRanking: 'M', organType: 'Gearbox', energy: 'Diesel',
    allianceCode: 'M920DDVG2', vehicleCode: 'X67', standardEmissions: 'E06C',
    expectedEcoOutput: 'N/A', requestType: 'Creation',
    projectName: 'Feasibility study — gearbox', frameworkComment: 'RFI only',
  }),
  line('ffl-seed-6', {
    plNumber: '02AA', client: 'Mitsubishi', ownerN2: 'H-SOFTWARE', activityType: 'New Business',
    projectRanking: 'C36W', organType: 'Battery', energy: 'Electric',
    allianceCode: 'BT1AE1', vehicleCode: 'TX26', standardEmissions: 'ELC1',
    expectedEcoOutput: '', requestType: 'Modification',
    projectName: 'Battery info request', frameworkComment: '',
  }),
];
