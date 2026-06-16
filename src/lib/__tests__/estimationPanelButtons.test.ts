import { describe, it, expect } from 'vitest';
import { panelCopyAction } from '../estimationPanelButtons';
import type { Estimation } from '../../types';

const est = { lineId: 'PL-1' } as Estimation;

describe('panelCopyAction', () => {
  it('shows legacy import when unsaved and editable', () => {
    expect(panelCopyAction({ existing: null, canEdit: true, canCopy: true, locked: false }))
      .toBe('legacy');
  });

  it('shows copy-from-lines when a draft already exists', () => {
    expect(panelCopyAction({ existing: est, canEdit: true, canCopy: true, locked: false }))
      .toBe('copy');
  });

  it('shows nothing without the copy capability', () => {
    expect(panelCopyAction({ existing: null, canEdit: true, canCopy: false, locked: false }))
      .toBe('none');
    expect(panelCopyAction({ existing: est, canEdit: true, canCopy: false, locked: false }))
      .toBe('none');
  });

  it('shows nothing when the panel is locked', () => {
    expect(panelCopyAction({ existing: est, canEdit: false, canCopy: true, locked: true }))
      .toBe('none');
  });

  it('shows nothing when unsaved but not editable', () => {
    expect(panelCopyAction({ existing: null, canEdit: false, canCopy: true, locked: false }))
      .toBe('none');
  });
});
