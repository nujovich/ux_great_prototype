import { describe, it, expect } from 'vitest';
import { FRAMING_REFERENCE } from '../framingReference';

describe('FRAMING_REFERENCE (PRD §4.2 — verbatim from demo_list.py)', () => {
  it('reproduces Project ranking exactly and in order', () => {
    expect(FRAMING_REFERENCE.projectRanking).toEqual(
      ['GM', 'M', 'B', 'C133W', 'C93W', 'C72W', 'C36W'],
    );
  });

  it('reproduces CPO Department exactly', () => {
    expect(FRAMING_REFERENCE.cpoDepartment).toEqual(['H-Project', 'H-R&AE', 'H-NP', 'H-TAS']);
  });

  it('reproduces Expected ECO Output exactly — it drives §15.1 classification', () => {
    expect(FRAMING_REFERENCE.expectedEcoOutput).toEqual(['ECO1', 'ECO2', 'ECO3', 'N/A']);
  });

  it('keeps the empty first value of Techno Group', () => {
    expect(FRAMING_REFERENCE.technoGroup[0]).toBe('');
    expect(FRAMING_REFERENCE.technoGroup).toHaveLength(6);
  });

  it('reproduces Request type exactly — no Suppression, per the POC', () => {
    expect(FRAMING_REFERENCE.requestType).toEqual(['Creation', 'Modification', 'Closure']);
  });

  it('offers organType and energy in English, not the POC French source', () => {
    expect(FRAMING_REFERENCE.organType).toContain('Gearbox');
    expect(FRAMING_REFERENCE.organType).toContain('Electric Engine');
    expect(FRAMING_REFERENCE.organType).not.toContain('Electrical Engine');
    expect(FRAMING_REFERENCE.organType).not.toContain('Boîte de vitesse');
    expect(FRAMING_REFERENCE.energy).toContain('Hybrid - Gasoline');
    expect(FRAMING_REFERENCE.energy).not.toContain('Hybride - Essence');
  });

  it('carries the long POC lists at full length', () => {
    expect(FRAMING_REFERENCE.allianceCode.length).toBeGreaterThan(90);
    expect(FRAMING_REFERENCE.standardEmissions.length).toBeGreaterThan(60);
    // Source (demo_list.py:132-146) has 25 entries (5 "CE0xB" + 20 "CI0xB..CI20B"),
    // verified with ast.literal_eval — not the 24 the task brief predicted.
    expect(FRAMING_REFERENCE.countryCluster).toHaveLength(25);
    expect(FRAMING_REFERENCE.vehicleRange).toHaveLength(18);
    expect(FRAMING_REFERENCE.cmo).toHaveLength(19);
    expect(FRAMING_REFERENCE.eeArchitecture).toHaveLength(17);
    expect(FRAMING_REFERENCE.whyThisRequest).toHaveLength(9);
    expect(FRAMING_REFERENCE.activityType).toHaveLength(9);
  });

  it('offers 4X2 and 4X4 for drivetrain', () => {
    expect(FRAMING_REFERENCE.drivetrain).toEqual(['4X2', '4X4']);
  });
});
