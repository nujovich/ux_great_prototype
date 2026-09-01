import { describe, it, expect } from 'vitest';
import {
  isRenaultClient, familyFor, decode, encode, FAMILY_CAPACITY, assignPlNumbers,
  familyOf, reassignPlNumbers, InvalidStartingPlNumberError, nextPlNumber,
} from '../plNumber';

describe('client → family (§5.4)', () => {
  it.each(['RG', 'Renault', 'Renault Group', 'renault sas', 'RENAULT', '', '   '])(
    'treats %j as the Renault LLNN family', (client) => {
      expect(isRenaultClient(client)).toBe(true);
      expect(familyFor(client)).toBe('LLNN');
    });

  it.each(['Nissan', 'Dacia', 'Mitsubishi'])('treats %j as the NNLL family', (client) => {
    expect(isRenaultClient(client)).toBe(false);
    expect(familyFor(client)).toBe('NNLL');
  });

  it('treats null and undefined as Renault (empty defaults to RG, §5.2)', () => {
    expect(familyFor(null)).toBe('LLNN');
    expect(familyFor(undefined)).toBe('LLNN');
  });
});

describe('ordinal codec', () => {
  it('maps the family seeds to ordinal 0', () => {
    expect(decode('AA00', 'LLNN')).toBe(0);
    expect(decode('00AA', 'NNLL')).toBe(0);
    expect(encode(0, 'LLNN')).toBe('AA00');
    expect(encode(0, 'NNLL')).toBe('00AA');
  });

  it('advances numbers before letters — LLNN', () => {
    expect(encode(decode('AA99', 'LLNN')! + 1, 'LLNN')).toBe('AB00');
    expect(encode(decode('AZ99', 'LLNN')! + 1, 'LLNN')).toBe('BA00');
    expect(encode(decode('AA00', 'LLNN')! + 1, 'LLNN')).toBe('AA01');
  });

  it('advances numbers before letters — NNLL', () => {
    expect(encode(decode('99AA', 'NNLL')! + 1, 'NNLL')).toBe('00AB');
    expect(encode(decode('00AA', 'NNLL')! + 1, 'NNLL')).toBe('01AA');
    expect(encode(decode('99AB', 'NNLL')! + 1, 'NNLL')).toBe('00AC');
  });

  it('caps each family at 26 × 26 × 100 combinations', () => {
    expect(FAMILY_CAPACITY).toBe(67600);
    expect(encode(FAMILY_CAPACITY - 1, 'LLNN')).toBe('ZZ99');
    expect(encode(FAMILY_CAPACITY - 1, 'NNLL')).toBe('99ZZ');
    expect(() => encode(FAMILY_CAPACITY, 'LLNN')).toThrow(/exhausted/i);
  });

  it('rejects codes of the other family, so the two never compare', () => {
    expect(decode('05AZ', 'LLNN')).toBeNull();
    expect(decode('AA05', 'NNLL')).toBeNull();
    expect(decode('PL-016', 'LLNN')).toBeNull();
    expect(decode('AAA0', 'LLNN')).toBeNull();
  });

  it('decodes lowercase letters case-insensitively', () => {
    expect(decode('aa01', 'LLNN')).toBe(1);
  });
});

describe('assignPlNumbers (§5.4)', () => {
  it('keeps a file-provided value verbatim, in any format', () => {
    const rows = [{ plNumber: 'PL-016/xyz', client: 'RG' }];
    expect(assignPlNumbers(rows, [])[0].plNumber).toBe('PL-016/xyz');
  });

  it('seeds AA00 when the Renault family is empty', () => {
    const rows = [{ plNumber: '', client: 'RG' }];
    expect(assignPlNumbers(rows, [])[0].plNumber).toBe('AA00');
  });

  it('seeds 00AA when the non-Renault family is empty', () => {
    const rows = [{ plNumber: '', client: 'Nissan' }];
    expect(assignPlNumbers(rows, [])[0].plNumber).toBe('00AA');
  });

  it('generates global-max + 1 for its own family only', () => {
    const rows = [{ plNumber: '', client: 'RG' }, { plNumber: '', client: 'Nissan' }];
    const out = assignPlNumbers(rows, ['AA07', '13AC', 'PL-016']);
    expect(out[0].plNumber).toBe('AA08');
    expect(out[1].plNumber).toBe('14AC');
  });

  it('assigns consecutive codes to several empty rows of one family', () => {
    const rows = [
      { plNumber: '', client: 'RG' },
      { plNumber: '', client: 'Renault Group' },
      { plNumber: '', client: '' },
    ];
    const out = assignPlNumbers(rows, ['AA98']);
    expect(out.map((r) => r.plNumber)).toEqual(['AA99', 'AB00', 'AB01']);
  });

  it('interleaves the two families without cross-contamination', () => {
    const rows = [
      { plNumber: '', client: 'RG' },
      { plNumber: '', client: 'Nissan' },
      { plNumber: '', client: 'RG' },
      { plNumber: 'KEEP-ME', client: 'Nissan' },
      { plNumber: '', client: 'Dacia' },
    ];
    const out = assignPlNumbers(rows, ['AB00', '00AA']);
    expect(out.map((r) => r.plNumber)).toEqual(['AB01', '01AA', 'AB02', 'KEEP-ME', '02AA']);
  });

  it('ignores unparseable existing codes when computing the max', () => {
    const rows = [{ plNumber: '', client: 'RG' }];
    expect(assignPlNumbers(rows, ['nonsense', '', 'PL-1'])[0].plNumber).toBe('AA00');
  });

  it('does not mutate the input rows', () => {
    const rows = [{ plNumber: '', client: 'RG' }];
    assignPlNumbers(rows, []);
    expect(rows[0].plNumber).toBe('');
  });
});

describe('familyOf (POC starting-code validation)', () => {
  it.each([['AA00', 'LLNN'], ['IF65', 'LLNN'], ['ZZ99', 'LLNN'], ['00AA', 'NNLL'], ['13AC', 'NNLL']])(
    'reads %j as family %s', (code, family) => {
      expect(familyOf(code)).toBe(family);
    });

  it.each(['', '   ', 'New', 'XXXX', 'to be open', 'AAA0', 'A000', '1234', 'AA0', 'AA000'])(
    'rejects %j as a PL Number of either family', (code) => {
      expect(familyOf(code)).toBeNull();
    });

  it('is whitespace tolerant', () => {
    expect(familyOf('  IF65 ')).toBe('LLNN');
  });
});

describe('reassignPlNumbers (POC fill_xxxx_pl_numbers)', () => {
  const row = (client: string, plNumber = '') => ({ plNumber, client });

  it('overwrites every code with a sequence from the starting code', () => {
    const rows = [row('RG', 'IE59'), row('RG', 'New'), row('RG', '')];
    expect(reassignPlNumbers(rows, 'IF01', []).map((r) => r.plNumber))
      .toEqual(['IF01', 'IF02', 'IF03']);
  });

  it('never collapses placeholder rows onto one code (the HIW-452 upload bug)', () => {
    const rows = Array.from({ length: 52 }, () => row('RG', 'to be open'));
    const codes = reassignPlNumbers(rows, 'IF01', []).map((r) => r.plNumber);
    expect(new Set(codes).size).toBe(52);
  });

  it('advances numbers before letters, like assignPlNumbers (§5.4)', () => {
    const rows = [row('RG'), row('RG'), row('RG')];
    expect(reassignPlNumbers(rows, 'AA98', []).map((r) => r.plNumber))
      .toEqual(['AA98', 'AA99', 'AB00']);
  });

  it('keeps the two families on separate sequences (§5.4)', () => {
    const rows = [row('RG'), row('Nissan'), row('RG'), row('Dacia')];
    expect(reassignPlNumbers(rows, 'IF01', ['07AB']).map((r) => r.plNumber))
      .toEqual(['IF01', '08AB', 'IF02', '09AB']);
  });

  it('seeds the untouched family from the global max, not from zero', () => {
    const rows = [row('Nissan')];
    expect(reassignPlNumbers(rows, 'IF01', ['13AC', 'AA07']).map((r) => r.plNumber))
      .toEqual(['14AC']);
  });

  it('starts the untouched family at its seed when no code of it exists yet', () => {
    const rows = [row('Nissan')];
    expect(reassignPlNumbers(rows, 'IF01', ['AA07']).map((r) => r.plNumber)).toEqual(['00AA']);
  });

  it('rejects a starting code that is not a valid PL Number', () => {
    expect(() => reassignPlNumbers([row('RG')], 'New', []))
      .toThrow(InvalidStartingPlNumberError);
  });

  it('does not mutate the input rows', () => {
    const rows = [row('RG', 'IE59')];
    reassignPlNumbers(rows, 'IF01', []);
    expect(rows[0].plNumber).toBe('IE59');
  });
});

describe('nextPlNumber (upload pre-fill)', () => {
  it('seeds each family when no code exists yet', () => {
    expect(nextPlNumber([])).toBe('AA00');
    expect(nextPlNumber([], 'NNLL')).toBe('00AA');
  });

  it('continues from the global max of the requested family only', () => {
    expect(nextPlNumber(['AA07', '13AC', 'garbage'])).toBe('AA08');
    expect(nextPlNumber(['AA07', '13AC'], 'NNLL')).toBe('14AC');
  });
});
