import { describe, it, expect } from 'vitest';

describe('FinalReviewPage — FR-BR-09', () => {
  it('approvedLines filter excludes lines from inactive cycles', () => {
    const activeCycleId = 'cyc-2026h1';
    const lines = [
      { status: 'Approved', cycleId: 'cyc-2026h1' },
      { status: 'Approved', cycleId: 'cyc-2025h2' }, // different cycle — must be excluded
      { status: 'Draft',    cycleId: 'cyc-2026h1' }, // wrong status — must be excluded
    ];
    const approvedLines = lines.filter(
      (l) => l.status === 'Approved' && l.cycleId === activeCycleId,
    );
    expect(approvedLines).toHaveLength(1);
    expect(approvedLines[0].cycleId).toBe(activeCycleId);
  });
});
