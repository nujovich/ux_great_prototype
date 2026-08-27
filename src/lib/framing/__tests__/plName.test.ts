import { describe, it, expect } from 'vitest';
import { composePlName } from '../plName';

const base = {
  plNumber: 'AA01', activityType: '', allianceCode: 'HR10DDTG2',
  secondaryOrgan: 'SO', thirdOrgan: 'TO', fourthOrgan: 'FO',
  standardEmissions: 'E06C', vehicleCode: 'X67', otherSpecifications: 'SPEC',
  drivetrain: '4X2', vehiclePhase: 'PH1', projectRanking: 'M',
};

describe('composePlName (§5.3)', () => {
  it('orders M/B/GM components with Activity type second and Vehicle code after emissions', () => {
    expect(composePlName({ ...base, projectRanking: 'M', activityType: 'CPU' })).toBe(
      'AA01 CPU HR10DDTG2 SO TO FO E06C X67 SPEC PH1',
    );
  });

  it.each(['M', 'B', 'GM'])('uses the M/B/GM order for ranking %s', (projectRanking) => {
    const name = composePlName({ ...base, projectRanking, activityType: 'CPU' });
    expect(name.startsWith('AA01 CPU HR10DDTG2')).toBe(true);
  });

  it('defaults Activity type to MBTP when empty, for M/B/GM only', () => {
    expect(composePlName({ ...base, projectRanking: 'B', activityType: '' })).toContain('AA01 MBTP');
    expect(composePlName({ ...base, projectRanking: 'B', activityType: '   ' })).toContain('AA01 MBTP');
  });

  it('orders Child components with Vehicle code second and no Activity type', () => {
    expect(composePlName({ ...base, projectRanking: 'C93W', activityType: 'CPU' })).toBe(
      'AA01 X67 HR10DDTG2 SO TO FO E06C SPEC PH1',
    );
  });

  it.each(['C133W', 'C93W', 'C72W', 'C36W', 'anything else'])(
    'uses the Child order for ranking %s', (projectRanking) => {
      expect(composePlName({ ...base, projectRanking })).not.toContain('MBTP');
    });

  it('hides 4X2 and appends 4X4 just before Vehicle Phase', () => {
    expect(composePlName({ ...base, drivetrain: '4X2' })).not.toContain('4X2');
    expect(composePlName({ ...base, drivetrain: '4X4' })).toContain('SPEC 4X4 PH1');
    expect(composePlName({ ...base, drivetrain: '4x4' })).toContain('4X4');
  });

  it('omits empty components without leaving double separators', () => {
    const name = composePlName({
      ...base, projectRanking: 'C36W', secondaryOrgan: '', thirdOrgan: '   ',
      fourthOrgan: '', otherSpecifications: '', drivetrain: '', vehiclePhase: '',
    });
    expect(name).toBe('AA01 X67 HR10DDTG2 E06C');
    expect(name).not.toMatch(/\s{2}/);
  });

  it('keeps Vehicle Phase last whenever present', () => {
    const name = composePlName({ ...base, drivetrain: '4X4', vehiclePhase: 'PH2' });
    expect(name.endsWith('PH2')).toBe(true);
  });

  it('matches ranking case-insensitively', () => {
    expect(composePlName({ ...base, projectRanking: 'm', activityType: 'CPU' })).toContain('AA01 CPU');
  });
});
