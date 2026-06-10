import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, type Permission } from '../roles';

function can(role: keyof typeof ROLE_PERMISSIONS, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}

describe('Pre-Estimation permissions (pre_estimation_specs.py)', () => {
  it('Admin can view and edit pre-estimation', () => {
    expect(can('Admin', 'view:pre-estimation')).toBe(true);
    expect(can('Admin', 'edit:estimation')).toBe(true);
  });
  it('Engineer can view and edit pre-estimation (own lines)', () => {
    expect(can('Engineer', 'view:pre-estimation')).toBe(true);
    expect(can('Engineer', 'edit:estimation')).toBe(true);
    expect(can('Engineer', 'view:own-lines-only')).toBe(true);
  });
  it('PMO can view pre-estimation but NOT edit (spec: can_edit=False)', () => {
    expect(can('PMO', 'view:pre-estimation')).toBe(true);
    expect(can('PMO', 'edit:estimation')).toBe(false);
    expect(can('PMO', 'save:draft')).toBe(false);
    expect(can('PMO', 'save:definitive')).toBe(false);
  });
  it('RCRC can view pre-estimation but NOT edit (spec: can_edit=False)', () => {
    expect(can('RCRC', 'view:pre-estimation')).toBe(true);
    expect(can('RCRC', 'edit:estimation')).toBe(false);
  });
  it('CPO cannot view pre-estimation (spec: can_view=False)', () => {
    expect(can('CPO', 'view:pre-estimation')).toBe(false);
  });
  it('Admin cannot reject estimations (spec: can_reject=False)', () => {
    expect(can('Admin', 'reject:estimation')).toBe(false);
    expect(can('Admin', 'approve:estimation')).toBe(false);
  });
  it('PMO cannot reject estimations (spec: can_reject=False)', () => {
    expect(can('PMO', 'reject:estimation')).toBe(false);
    expect(can('PMO', 'approve:estimation')).toBe(false);
  });
  it('CPO can reject estimations', () => {
    expect(can('CPO', 'reject:estimation')).toBe(true);
  });

  it('CPO cannot approve directly — approval comes via HVT only (ERev-BR-10)', () => {
    expect(can('CPO', 'approve:estimation')).toBe(false);
  });

  it('only Admin can simulate HVT approval in prototype (ERev-BR-10)', () => {
    expect(can('Admin', 'simulate:hvt-approval')).toBe(true);
    expect(can('PMO', 'simulate:hvt-approval')).toBe(false);
    expect(can('CPO', 'simulate:hvt-approval')).toBe(false);
  });
});

describe('Estimation Review permissions (estimation_review_specs.py)', () => {
  it('Engineer can view EstimationReview (own rows — scoped via view:own-lines-only)', () => {
    expect(can('Engineer', 'view:estimation-review')).toBe(true);
  });
  it('PMO can send to HVT', () => {
    expect(can('PMO', 'send:hvt')).toBe(true);
  });
  it('All roles can export EstimationReview CSV', () => {
    expect(can('Admin', 'export:estimation-review')).toBe(true);
    expect(can('PMO', 'export:estimation-review')).toBe(true);
    expect(can('RCRC', 'export:estimation-review')).toBe(true);
    expect(can('Engineer', 'export:estimation-review')).toBe(true);
    expect(can('CPO', 'export:estimation-review')).toBe(true);
  });
});

describe('Allocation permissions (allocation_specs.py)', () => {
  it('Admin, PMO, RCRC can view and edit allocation', () => {
    expect(can('Admin', 'view:allocation')).toBe(true);
    expect(can('PMO', 'view:allocation')).toBe(true);
    expect(can('RCRC', 'view:allocation')).toBe(true);
    expect(can('Admin', 'edit:allocation')).toBe(true);
    expect(can('PMO', 'edit:allocation')).toBe(true);
    expect(can('RCRC', 'edit:allocation')).toBe(true);
  });
  it('Engineer cannot view allocation', () => {
    expect(can('Engineer', 'view:allocation')).toBe(false);
  });
  it('CPO cannot view allocation (spec: can_view=False)', () => {
    expect(can('CPO', 'view:allocation')).toBe(false);
  });
});

describe('Management View permissions (management_view_specs.py)', () => {
  it('only Admin and PMO can view Management', () => {
    expect(can('Admin', 'view:management')).toBe(true);
    expect(can('PMO', 'view:management')).toBe(true);
  });
  it('RCRC cannot view Management (spec: MANAGEMENT_ACCESS[RCRC]=False)', () => {
    expect(can('RCRC', 'view:management')).toBe(false);
  });
  it('CPO cannot view Management (spec: MANAGEMENT_ACCESS[CPO]=False)', () => {
    expect(can('CPO', 'view:management')).toBe(false);
  });
  it('Engineer cannot view Management', () => {
    expect(can('Engineer', 'view:management')).toBe(false);
  });
});

describe('Final Review permissions (final_review_specs.py)', () => {
  it('all roles can view and export Final Review', () => {
    for (const role of ['Admin', 'PMO', 'RCRC', 'Engineer', 'CPO'] as const) {
      expect(can(role, 'view:final-review')).toBe(true);
      expect(can(role, 'export:final-review')).toBe(true);
    }
  });
  it('only Admin and PMO can send Stage 3', () => {
    expect(can('Admin', 'send:stage3')).toBe(true);
    expect(can('PMO', 'send:stage3')).toBe(true);
    expect(can('RCRC', 'send:stage3')).toBe(false);
    expect(can('Engineer', 'send:stage3')).toBe(false);
    expect(can('CPO', 'send:stage3')).toBe(false);
  });
});

describe('Workload Standard permissions (transversal_specs.py)', () => {
  it('Admin and RCRC can upload workload standards', () => {
    expect(can('Admin', 'upload:workload-standards')).toBe(true);
    expect(can('RCRC', 'upload:workload-standards')).toBe(true);
  });
  it('PMO/Engineer/CPO cannot upload workload standards', () => {
    expect(can('PMO', 'upload:workload-standards')).toBe(false);
    expect(can('Engineer', 'upload:workload-standards')).toBe(false);
    expect(can('CPO', 'upload:workload-standards')).toBe(false);
  });
});

describe('Custom JU permissions (pre_estimation_specs.py — BR-20)', () => {
  it('Engineer and Admin can create Custom JUs (BR-20)', () => {
    expect(can('Engineer', 'edit:custom-jus')).toBe(true);
    expect(can('Admin', 'edit:custom-jus')).toBe(true);
  });

  it('PMO, RCRC and CPO cannot create Custom JUs (BR-20)', () => {
    expect(can('PMO', 'edit:custom-jus')).toBe(false);
    expect(can('RCRC', 'edit:custom-jus')).toBe(false);
    expect(can('CPO', 'edit:custom-jus')).toBe(false);
  });
});
