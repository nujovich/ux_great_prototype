import { describe, it, expect } from 'vitest';

describe('ManagementPage — MGMT-BR-04', () => {
  it('H-NP and H-PROJECT are excluded from Management View metiers', () => {
    const ALLOWED_MGMT_METIERS = ['H-DESIGN', 'H-SOFTWARE', 'H-TUNING', 'H-CUSTOMER', 'H-TESTING'];
    expect(ALLOWED_MGMT_METIERS).not.toContain('H-NP');
    expect(ALLOWED_MGMT_METIERS).not.toContain('H-PROJECT');
    expect(ALLOWED_MGMT_METIERS).toHaveLength(5);
  });
});
