import { describe, it, expect } from 'vitest';
import { hasPermission } from '../permissions';

describe('PMO is read-only over estimation content (HIW-174 §2 / BR-20)', () => {
  const denied = ['edit:estimation', 'save:draft', 'save:definitive', 'copy:estimation', 'edit:custom-jus'] as const;
  it.each(denied)('PMO must NOT have %s', (perm) => {
    expect(hasPermission('PMO', perm)).toBe(false);
  });
  it('PMO can still view pre-estimation', () => {
    expect(hasPermission('PMO', 'view:pre-estimation')).toBe(true);
  });
  it('Engineer CAN edit and save', () => {
    expect(hasPermission('Engineer', 'edit:estimation')).toBe(true);
    expect(hasPermission('Engineer', 'save:draft')).toBe(true);
  });
});
