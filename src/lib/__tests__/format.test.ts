import { describe, it, expect } from 'vitest';
import { formatFTE, formatBenchHours, formatKm, formatDays, formatKEuro } from '../format';

describe('formatFTE', () => {
  it('uses the FTE unit suffix (HIW-174 K10)', () => {
    expect(formatFTE(3)).toBe('3.0 FTE');
  });
  it('renders em dash for null', () => {
    expect(formatFTE(null)).toBe('—');
  });
});

describe('unit formatters (HIW-174 §6 totals)', () => {
  it('formats FTE with one decimal', () => {
    expect(formatFTE(1.234)).toBe('1.2 FTE');
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
