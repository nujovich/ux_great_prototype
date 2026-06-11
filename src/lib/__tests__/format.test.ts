import { describe, it, expect } from 'vitest';
import { formatFTE, formatBenchHours, formatKm, formatDays, formatKEuro } from '../format';

describe('unit formatters (HIW-174 §6 totals)', () => {
  it('formats FTE/ETP with one decimal', () => {
    expect(formatFTE(1.234)).toBe('1.2 ETP');
    expect(formatFTE(null)).toBe('—');
  });
  it('formats bench hours', () => {
    expect(formatBenchHours(16)).toBe('16.0 BH');
    expect(formatBenchHours(null)).toBe('—');
  });
  it('formats kilometres', () => {
    expect(formatKm(20.5)).toBe('20.5 km');
    expect(formatKm(null)).toBe('—');
  });
  it('keeps existing day and k€ formatters', () => {
    expect(formatDays(6.5)).toBe('6.5 d');
    expect(formatKEuro(0)).toBe('0.0 k€');
  });
});
