import { describe, it, expect } from 'vitest';
import { panelCopyButtons } from '../estimationPanelButtons';
import type { Estimation } from '../../types';

const est = { lineId: 'PL-1' } as Estimation;

describe('panelCopyButtons', () => {
  it('shows legacy import (not copy) when unsaved and editable', () => {
    expect(panelCopyButtons({ existing: null, canEdit: true, canCopy: true, locked: false }))
      .toEqual({ legacy: true, copy: false });
  });

  it('keeps legacy import available AND offers copy once a draft exists (HIW-174 retest2)', () => {
    expect(panelCopyButtons({ existing: est, canEdit: true, canCopy: true, locked: false }))
      .toEqual({ legacy: true, copy: true });
  });

  it('shows copy only when a draft exists but the panel is not editable', () => {
    expect(panelCopyButtons({ existing: est, canEdit: false, canCopy: true, locked: false }))
      .toEqual({ legacy: false, copy: true });
  });

  it('shows nothing without the copy capability', () => {
    expect(panelCopyButtons({ existing: null, canEdit: true, canCopy: false, locked: false }))
      .toEqual({ legacy: false, copy: false });
    expect(panelCopyButtons({ existing: est, canEdit: true, canCopy: false, locked: false }))
      .toEqual({ legacy: false, copy: false });
  });

  it('shows nothing when the panel is locked', () => {
    expect(panelCopyButtons({ existing: est, canEdit: false, canCopy: true, locked: true }))
      .toEqual({ legacy: false, copy: false });
  });

  it('shows nothing when unsaved but not editable', () => {
    expect(panelCopyButtons({ existing: null, canEdit: false, canCopy: true, locked: false }))
      .toEqual({ legacy: false, copy: false });
  });
});
