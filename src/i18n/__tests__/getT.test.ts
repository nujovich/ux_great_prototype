import { describe, it, expect } from 'vitest';
import { getT } from '../getT';

describe('getT', () => {
  it('returns Spanish string for es', () => {
    const t = getT('es');
    expect(t('nav.home')).toBe('Inicio');
  });

  it('returns English string for en', () => {
    const t = getT('en');
    expect(t('nav.home')).toBe('Home');
  });

  it('returns key path as fallback for missing key', () => {
    const t = getT('es');
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('interpolates {var} placeholders', () => {
    const t = getT('es');
    const result = t('bulk.selected', { n: 3 });
    expect(result).toContain('3');
  });

  it('interpolates {var} in English', () => {
    const t = getT('en');
    const result = t('bulk.selected', { n: 5 });
    expect(result).toContain('5');
  });
});
