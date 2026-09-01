import { describe, it, expect } from 'vitest';
import { FRAMING_LINES } from '../framingLines';
import { classifyLine } from '../../lib/framing/classify';
import { composePlName } from '../../lib/framing/plName';

describe('FRAMING_LINES seed', () => {
  it('populates both tabs', () => {
    expect(FRAMING_LINES.filter((l) => l.track === 'RFQ').length).toBeGreaterThanOrEqual(4);
    expect(FRAMING_LINES.filter((l) => l.track === 'RFI').length).toBeGreaterThanOrEqual(2);
  });

  it('uses unique PL numbers and ids', () => {
    expect(new Set(FRAMING_LINES.map((l) => l.plNumber)).size).toBe(FRAMING_LINES.length);
    expect(new Set(FRAMING_LINES.map((l) => l.id)).size).toBe(FRAMING_LINES.length);
  });

  it('keeps track consistent with expectedEcoOutput (§15.1)', () => {
    for (const line of FRAMING_LINES) {
      expect(line.track).toBe(classifyLine(line.expectedEcoOutput));
    }
  });

  it('carries a PL Name consistent with §5.3', () => {
    for (const line of FRAMING_LINES) {
      expect(line.plName).toBe(composePlName(line));
    }
  });

  it('includes at least one row of each PL Number family, for §5.4 exercise', () => {
    expect(FRAMING_LINES.some((l) => /^[A-Z]{2}\d{2}$/.test(l.plNumber))).toBe(true);
    expect(FRAMING_LINES.some((l) => /^\d{2}[A-Z]{2}$/.test(l.plNumber))).toBe(true);
  });

  it('includes a parent link so §5.5 is exercised', () => {
    const child = FRAMING_LINES.find((l) => l.parentPlNumber !== '');
    expect(child).toBeDefined();
    expect(FRAMING_LINES.some((l) => l.plNumber === child!.parentPlNumber)).toBe(true);
  });
});
