import { describe, it, expect } from 'vitest';
import { buildProtoEstimation } from '../protoPersist';

describe('buildProtoEstimation (HIW-14 §8)', () => {
  it('produces a PrototypeEstimation with lineId, quantities, and comment', () => {
    const result = buildProtoEstimation(
      'PL-001',
      { 'proto-cat-1': 2, 'proto-cat-2': 0, 'proto-cat-3': 1, 'proto-cat-4': 3 },
      'Requires thermal validation',
    );
    expect(result.lineId).toBe('PL-001');
    expect(result.quantities['proto-cat-1']).toBe(2);
    expect(result.quantities['proto-cat-4']).toBe(3);
    expect(result.comment).toBe('Requires thermal validation');
  });

  it('accepts an empty quantities map and empty comment', () => {
    const result = buildProtoEstimation('PL-002', {}, '');
    expect(result.lineId).toBe('PL-002');
    expect(result.quantities).toEqual({});
    expect(result.comment).toBe('');
  });

  it('does not share reference with the input quantities map', () => {
    const input = { 'proto-cat-1': 2 };
    const result = buildProtoEstimation('PL-001', input, '');
    input['proto-cat-1'] = 99;
    expect(result.quantities['proto-cat-1']).toBe(2);
  });
});
