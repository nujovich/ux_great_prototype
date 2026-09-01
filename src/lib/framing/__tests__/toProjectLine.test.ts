import { describe, it, expect } from 'vitest';
import { EMPTY_FRAMING_LINE, type FramingLine } from '../../../types/framing';
import { framingLineToProjectLine, isSendableToPreEstimation } from '../toProjectLine';

const line = (over: Partial<FramingLine> = {}): FramingLine => ({
  ...EMPTY_FRAMING_LINE,
  plNumber: 'AA03',
  plName: 'AA03 MBTP HR10DDTG2 X67 PH1',
  projectName: 'X67 Gearbox uplift',
  ownerN2: 'H-DESIGN',
  track: 'RFQ',
  organType: 'Gearbox',
  energy: 'Diesel',
  projectRanking: 'M',
  client: 'RG',
  requestType: 'Creation',
  allianceCode: 'HR10DDTG2',
  vehicleCode: 'X67',
  standardEmissions: 'E06C',
  spDate: '2027-01-11',
  pcDate: '2027-03-01',
  coDate: '2027-06-01',
  sopDate: '2028-09-01',
  ...over,
});

const OPTS = { cycleId: 'cyc-2026h1', actor: 'PMO' };

describe('isSendableToPreEstimation', () => {
  it('accepts an RFQ line whose Owner N2 is a known métier', () => {
    expect(isSendableToPreEstimation(line())).toBe(true);
  });

  it.each(['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-CUSTOMER', 'H-PROJECT', 'H-NP', 'H-TESTING'])(
    'accepts %s', (ownerN2) => {
      expect(isSendableToPreEstimation(line({ ownerN2 }))).toBe(true);
    });

  it('tolerates surrounding whitespace and case in Owner N2', () => {
    expect(isSendableToPreEstimation(line({ ownerN2: '  h-design ' }))).toBe(true);
  });

  it.each(['', '   ', 'H-UNKNOWN', 'Design'])('rejects %j as a métier', (ownerN2) => {
    expect(isSendableToPreEstimation(line({ ownerN2 }))).toBe(false);
  });

  it('rejects a line with no PL Number', () => {
    expect(isSendableToPreEstimation(line({ plNumber: '' }))).toBe(false);
  });

  it('rejects an RFI line — the send is RFQ only', () => {
    expect(isSendableToPreEstimation(line({ track: 'RFI' }))).toBe(false);
  });
});

describe('framingLineToProjectLine', () => {
  it('keys the project line on pl_number + metier, the documented composition', () => {
    const out = framingLineToProjectLine(line(), OPTS)!;
    expect(out.project_id).toBe('AA03-H-DESIGN');
    expect(out.id).toBe('AA03-H-DESIGN');
  });

  it('normalizes the métier it was handed', () => {
    const out = framingLineToProjectLine(line({ ownerN2: ' h-tuning ' }), OPTS)!;
    expect(out.metier).toBe('H-TUNING');
    expect(out.project_id).toBe('AA03-H-TUNING');
  });

  it('lands at To do — the one status both status models agree on', () => {
    expect(framingLineToProjectLine(line(), OPTS)!.status).toBe('To do');
  });

  it('carries nothing estimated', () => {
    const out = framingLineToProjectLine(line(), OPTS)!;
    expect(out.assignedEngineerId).toBeNull();
    expect(out.estimatedDays).toBeNull();
    expect(out.estimatedKEuro).toBeNull();
  });

  it('copies across the framing fields the grid shows', () => {
    const out = framingLineToProjectLine(line(), OPTS)!;
    expect(out).toMatchObject({
      plNumber: 'AA03',
      plName: 'AA03 MBTP HR10DDTG2 X67 PH1',
      projectName: 'X67 Gearbox uplift',
      organType: 'Gearbox',
      energy: 'Diesel',
      energyFuelType: 'Diesel',
      projectRanking: 'M',
      client: 'RG',
      requestType: 'Creation',
      allianceCode: 'HR10DDTG2',
      vehicleCode: 'X67',
      standardEmissions: 'E06C',
      spDate: '2027-01-11',
      pcDate: '2027-03-01',
      coDate: '2027-06-01',
      sopDate: '2028-09-01',
    });
  });

  it('leaves the fields Generate owns unset rather than inventing them', () => {
    const out = framingLineToProjectLine(line(), OPTS)!;
    expect(out.engineering).toBeUndefined();
    expect(out.estimateType).toBeUndefined();
    expect(out.injectionSystem).toBeUndefined();
    expect(out.market).toBeUndefined();
  });

  it('records the cycle and the acting role', () => {
    const out = framingLineToProjectLine(line(), OPTS)!;
    expect(out.cycleId).toBe('cyc-2026h1');
    expect(out.lastUpdatedBy).toBe('PMO');
  });

  it('stamps updated_at and lastUpdatedAt with the same instant', () => {
    const out = framingLineToProjectLine(line(), OPTS)!;
    expect(out.updated_at).toBe(out.lastUpdatedAt);
    expect(Number.isNaN(Date.parse(out.updated_at))).toBe(false);
  });

  it('returns null for a line it cannot map, rather than a half-built row', () => {
    expect(framingLineToProjectLine(line({ ownerN2: 'H-UNKNOWN' }), OPTS)).toBeNull();
    expect(framingLineToProjectLine(line({ track: 'RFI' }), OPTS)).toBeNull();
  });
});
