import { describe, it, expect } from 'vitest';
import { classifyLine } from '../classify';

describe('classifyLine (§15.1, ADR-020)', () => {
  it.each(['', '   ', 'N/A', 'n/a', ' N/A '])('classifies %j as RFI', (value) => {
    expect(classifyLine(value)).toBe('RFI');
  });

  it('classifies null and undefined as RFI', () => {
    expect(classifyLine(null)).toBe('RFI');
    expect(classifyLine(undefined)).toBe('RFI');
  });

  it.each(['ECO1', 'ECO2', 'ECO3', ' eco2 '])('classifies %j as RFQ', (value) => {
    expect(classifyLine(value)).toBe('RFQ');
  });

  it('classifies any other non-empty value as RFQ', () => {
    expect(classifyLine('ECO4')).toBe('RFQ');
  });
});
