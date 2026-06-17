import { describe, it, expect } from 'vitest';
import { isLineSelectableForEstimate } from '../lineSelection';
import type { ProjectLine, LineStatus } from '../../types';

function line(status: LineStatus): ProjectLine {
  return { status } as ProjectLine;
}

describe('isLineSelectableForEstimate', () => {
  it('blocks Estimated and Approved lines from bulk-estimate selection', () => {
    expect(isLineSelectableForEstimate(line('Estimated'))).toBe(false);
    expect(isLineSelectableForEstimate(line('Approved'))).toBe(false);
  });

  it('allows lines that have not been estimated/approved yet', () => {
    for (const s of ['To do', 'Draft', 'Sent', 'Modification Requested'] as LineStatus[]) {
      expect(isLineSelectableForEstimate(line(s))).toBe(true);
    }
  });
});
