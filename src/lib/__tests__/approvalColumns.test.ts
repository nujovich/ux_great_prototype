import { describe, it, expect } from 'vitest';
import { engineerApproval, cpoApproval } from '../approvalColumns';
import type { LineStatus } from '../../types';

describe('engineerApproval', () => {
  it('returns ✓ for Estimated, Sent, Approved', () => {
    const positiveStatuses: LineStatus[] = ['Estimated', 'Sent', 'Approved'];
    for (const s of positiveStatuses) {
      expect(engineerApproval(s)).toBe('✓');
    }
  });

  it('returns — for To do, Draft, Modification Requested', () => {
    const dashStatuses: LineStatus[] = ['To do', 'Draft', 'Modification Requested'];
    for (const s of dashStatuses) {
      expect(engineerApproval(s)).toBe('—');
    }
  });
});

describe('cpoApproval', () => {
  it('returns — (not yet sent) for Estimated', () => {
    expect(cpoApproval('Estimated')).toBe('— (not yet sent)');
  });

  it('returns ⏳ Pending for Sent', () => {
    expect(cpoApproval('Sent')).toBe('⏳ Pending');
  });

  it('returns ✓ Approved for Approved', () => {
    expect(cpoApproval('Approved')).toBe('✓ Approved');
  });

  it('returns ✗ Rejected for Modification Requested', () => {
    expect(cpoApproval('Modification Requested')).toBe('✗ Rejected');
  });

  it('returns — for To do and Draft', () => {
    expect(cpoApproval('To do')).toBe('—');
    expect(cpoApproval('Draft')).toBe('—');
  });
});
