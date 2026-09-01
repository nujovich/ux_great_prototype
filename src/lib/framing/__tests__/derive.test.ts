import { describe, it, expect } from 'vitest';
import {
  stripAccents, normalizeKey, translateOrganType, translateEnergy,
  resolveClient, normalizeDrivetrain, isDroppedRequestType, DEFAULT_CLIENT,
} from '../derive';

describe('normalization helpers', () => {
  it('strips accents', () => {
    expect(stripAccents('Boîte de vitesse')).toBe('Boite de vitesse');
    expect(stripAccents('Électrique')).toBe('Electrique');
    expect(stripAccents('Hydrogène')).toBe('Hydrogene');
  });

  it('folds case, trims, and collapses inner whitespace', () => {
    expect(normalizeKey('  Moteur   THERMIQUE ')).toBe('moteur thermique');
  });
});

describe('translateOrganType (§5.2, at upload)', () => {
  it.each([
    ['Moteur thermique', 'Thermal Engine'],
    ['Boîte de vitesse', 'Gearbox'],
    ['Batterie', 'Battery'],
    ['Moteur Electrique', 'Electric Engine'],
    ['moteur électrique', 'Electric Engine'],
    ['  BOITE DE VITESSE  ', 'Gearbox'],
  ])('translates %j to %j', (raw, expected) => {
    expect(translateOrganType(raw)).toBe(expected);
  });

  it('passes already-English values through unchanged', () => {
    expect(translateOrganType('Gearbox')).toBe('Gearbox');
    expect(translateOrganType('Electric Engine')).toBe('Electric Engine');
  });

  it('passes the two unmapped POC values through untranslated (spec gap 1)', () => {
    expect(translateOrganType('Réducteur')).toBe('Réducteur');
    expect(translateOrganType('Pile à combustible')).toBe('Pile à combustible');
  });

  it('never emits the legacy Electrical Engine typo', () => {
    expect(translateOrganType('Moteur Electrique')).not.toBe('Electrical Engine');
  });

  it('returns empty string for empty input', () => {
    expect(translateOrganType('')).toBe('');
    expect(translateOrganType(null)).toBe('');
  });
});

describe('translateEnergy (§5.2, at upload)', () => {
  it.each([
    ['Essence', 'Gasoline'],
    ['Diesel', 'Diesel'],
    ['Électrique', 'Electric'],
    ['Electrique', 'Electric'],
    ['Hybride - Essence', 'Hybrid - Gasoline'],
    ['Hybride - Diesel', 'Hybrid - Diesel'],
    ['GPL', 'LPG'],
    ['Hydrogène', 'Hydrogen'],
  ])('translates %j to %j', (raw, expected) => {
    expect(translateEnergy(raw)).toBe(expected);
  });

  it.each(['E10', 'E20', 'E26', 'E27', 'E85', 'E100 (FLEX FL)', 'N/A'])(
    'passes %j through unchanged', (raw) => {
      expect(translateEnergy(raw)).toBe(raw);
    });
});

describe('resolveClient (§5.2)', () => {
  it('prefers Customer over Client', () => {
    expect(resolveClient('Nissan', 'Dacia')).toBe('Nissan');
  });

  it('falls back to Client when Customer is blank', () => {
    expect(resolveClient('   ', 'Dacia')).toBe('Dacia');
  });

  it.each(['', '   ', 'nan', 'NaN', 'None', 'none'])(
    'defaults %j to RG', (customer) => {
      expect(resolveClient(customer, '')).toBe(DEFAULT_CLIENT);
    });

  it('defaults null and undefined to RG', () => {
    expect(resolveClient(null, null)).toBe('RG');
    expect(resolveClient(undefined, undefined)).toBe('RG');
  });

  it('trims the resolved value', () => {
    expect(resolveClient('  Nissan  ', '')).toBe('Nissan');
  });
});

describe('normalizeDrivetrain (§4.3)', () => {
  it.each([['4x2', '4X2'], ['4X2', '4X2'], ['4x4', '4X4'], ['  4X4 ', '4X4']])(
    'normalizes %j to %j', (raw, expected) => {
      expect(normalizeDrivetrain(raw)).toBe(expected);
    });

  it('returns empty string for anything else', () => {
    expect(normalizeDrivetrain('AWD')).toBe('');
    expect(normalizeDrivetrain('')).toBe('');
  });
});

describe('isDroppedRequestType (§4.3)', () => {
  it.each(['Suppression', 'suppression', 'Closure', '  CLOSURE '])(
    'drops %j', (raw) => {
      expect(isDroppedRequestType(raw)).toBe(true);
    });

  it.each(['Creation', 'Modification', '', 'Closed'])('keeps %j', (raw) => {
    expect(isDroppedRequestType(raw)).toBe(false);
  });
});
