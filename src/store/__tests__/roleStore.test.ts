import { describe, it, expect, beforeEach } from 'vitest';
import { useRoleStore } from '../roleStore';
import { useUIStore } from '../uiStore';

describe('roleStore.setRole', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedLineIds: [], estimationPanelLineId: null });
  });

  it('clears line selection and closes the panel when role changes (HIW-174 K3)', () => {
    useUIStore.getState().toggleSelect('PL-1');
    useUIStore.getState().openEstimationPanel('PL-1');

    useRoleStore.getState().setRole('PMO');

    expect(useUIStore.getState().selectedLineIds).toEqual([]);
    expect(useUIStore.getState().estimationPanelLineId).toBeNull();
  });
});
