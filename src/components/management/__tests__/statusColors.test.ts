import { describe, it, expect } from 'vitest';
import { STATUS_COLORS } from '../statusColors';
import type { LineStatus } from '../../../types';

const ALL_STATUSES: LineStatus[] = ['To do', 'Draft', 'Estimated', 'Sent', 'Modification Requested', 'Approved'];

describe('STATUS_COLORS', () => {
  it('defines a hex color for all 6 statuses (MGMT-BR-03)', () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_COLORS[s]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
    expect(Object.keys(STATUS_COLORS)).toHaveLength(6);
  });
});
