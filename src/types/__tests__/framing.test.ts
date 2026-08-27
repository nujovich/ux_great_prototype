import { describe, it, expect } from 'vitest';
import { EMPTY_FRAMING_LINE, FRAMING_FORM_FIELD_COUNT } from '../framing';

describe('FramingLine', () => {
  it('declares the 66 form fields from PRD §5.6', () => {
    expect(FRAMING_FORM_FIELD_COUNT).toBe(66);
  });

  it('seeds every form field as empty or null', () => {
    expect(EMPTY_FRAMING_LINE.plNumber).toBe('');
    expect(EMPTY_FRAMING_LINE.annualVolumeSop).toBeNull();
    expect(EMPTY_FRAMING_LINE.protosPfc).toBeNull();
    expect(EMPTY_FRAMING_LINE.track).toBe('RFQ');
  });

  it('carries the seven annual-volume fields of §5.6.2', () => {
    const keys = Object.keys(EMPTY_FRAMING_LINE).filter((k) => k.startsWith('annualVolumeSop'));
    expect(keys).toHaveLength(7);
  });

  it('carries activityType and ownerN2, needed by §5.3 and the §7.1 table', () => {
    expect(EMPTY_FRAMING_LINE).toHaveProperty('activityType');
    expect(EMPTY_FRAMING_LINE).toHaveProperty('ownerN2');
  });
});
