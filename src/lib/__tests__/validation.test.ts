import { describe, it, expect } from 'vitest';
import { validateBeforeSave } from '../validation';

describe('validateBeforeSave (BR-08)', () => {
  it('passes when spDate is present', () => {
    const result = validateBeforeSave({ spDate: '2026-01-01' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when spDate is undefined', () => {
    const result = validateBeforeSave({ spDate: undefined });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/SP Date/);
  });

  it('fails when spDate is empty string', () => {
    const result = validateBeforeSave({ spDate: '' });
    expect(result.valid).toBe(false);
  });

  it('fails when spDate is whitespace only', () => {
    const result = validateBeforeSave({ spDate: '   ' });
    expect(result.valid).toBe(false);
  });
});
