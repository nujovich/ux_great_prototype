import { describe, it, expect } from 'vitest';
import { parseCustomDate } from '../dates';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

describe('parseCustomDate (PRD §5.1, POC parse_custom_date parity)', () => {
  describe('rule 1 — null tokens', () => {
    it.each(['', '   ', 'n/a', 'N/A', 'non défini', 'NON DÉFINI', 'not defined', 'Not Defined', 'none', 'NONE'])(
      '%j → null',
      (value) => {
        expect(parseCustomDate(value)).toBeNull();
      },
    );

    it('null and undefined → null', () => {
      expect(parseCustomDate(null)).toBeNull();
      expect(parseCustomDate(undefined)).toBeNull();
    });
  });

  describe('rule 2 — W week codes', () => {
    it('W2431 parses to a Monday in week 31 of 2024', () => {
      const out = parseCustomDate('W2431');
      expect(out).toMatch(ISO_RE);
      expect(out).toBe('2024-07-29');
    });

    it('is case-insensitive', () => {
      expect(parseCustomDate('w2431')).toBe(parseCustomDate('W2431'));
    });
  });

  describe('rule 3 — cw week codes', () => {
    it('CW2520 and CW2736 both produce ISO dates, in ascending order', () => {
      const early = parseCustomDate('CW2520');
      const late = parseCustomDate('CW2736');
      expect(early).toMatch(ISO_RE);
      expect(late).toMatch(ISO_RE);
      expect(early! < late!).toBe(true);
    });

    it('CW2520 falls in 2025', () => {
      expect(parseCustomDate('CW2520')).toMatch(/^2025-/);
    });

    it('CW2736 falls in 2027', () => {
      expect(parseCustomDate('CW2736')).toMatch(/^2027-/);
    });

    it('is case-insensitive — CW2736 and cw2736 agree', () => {
      expect(parseCustomDate('cw2736')).toBe(parseCustomDate('CW2736'));
    });

    it('rejects a week number above 53, matching the POC', () => {
      expect(parseCustomDate('CW2554')).toBeNull();
      expect(parseCustomDate('CW2799')).toBeNull();
      expect(parseCustomDate('W2554')).toBeNull();
    });

    it('still accepts week 53 and week 00', () => {
      expect(parseCustomDate('CW2553')).not.toBeNull();
      expect(parseCustomDate('CW2500')).not.toBeNull();
    });

    it('the real file\'s six milestone codes are all parseable and chronological', () => {
      const codes = ['CW2520', 'CW2545', 'CW2610', 'CW2635', 'CW2710', 'CW2736'];
      const parsed = codes.map((c) => parseCustomDate(c));
      parsed.forEach((v) => expect(v).toMatch(ISO_RE));
      for (let i = 1; i < parsed.length; i += 1) {
        expect(parsed[i]! >= parsed[i - 1]!).toBe(true);
      }
    });
  });

  describe('rule 4 — month range', () => {
    it('Jan - Feb 2025 → 2025-01-01 (first month, day 1)', () => {
      expect(parseCustomDate('Jan - Feb 2025')).toBe('2025-01-01');
    });

    it('tolerates no space around the dash and mixed case', () => {
      expect(parseCustomDate('mar-apr 2026')).toBe('2026-03-01');
    });
  });

  describe('rule 5 — explicit formats, in order', () => {
    it('yyyy-mm-dd passes through unchanged', () => {
      expect(parseCustomDate('2025-04-03')).toBe('2025-04-03');
    });

    it('dd/mm/yyyy — 03/04/2025 is 3 April, not 4 March (the regression this guards)', () => {
      expect(parseCustomDate('03/04/2025')).toBe('2025-04-03');
    });

    it('dd-mm-yyyy', () => {
      expect(parseCustomDate('25-12-2026')).toBe('2026-12-25');
    });

    it('dd/mm/yy — two-digit year 00-68 maps to 20xx', () => {
      expect(parseCustomDate('05/06/26')).toBe('2026-06-05');
    });

    it('dd-mm-yy', () => {
      expect(parseCustomDate('05-06-26')).toBe('2026-06-05');
    });

    it('rejects an invalid calendar date rather than rolling it over', () => {
      expect(parseCustomDate('31/02/2025')).toBeNull();
    });
  });

  describe('rule 6 — unrecognized values', () => {
    it.each(['tbd', 'TBD', 'unknown', 'asdf', '2025/13/40'])('%j → null', (value) => {
      expect(parseCustomDate(value)).toBeNull();
    });

    it('does not loosely parse an ambiguous value via Date() semantics', () => {
      // Sanity check that native Date WOULD misread this as March 4th —
      // proving the explicit-format step above is what prevents it, not
      // an accidental correct guess by the platform.
      expect(new Date('03/04/2025').getUTCMonth()).toBe(2); // March, 0-indexed
      expect(parseCustomDate('03/04/2025')).not.toBe('2025-03-04');
    });
  });
});
