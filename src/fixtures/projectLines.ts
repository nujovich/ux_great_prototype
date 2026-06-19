import type { ProjectLine, LineStatus, Metier } from '../types';

const S = (s: string): LineStatus => s as LineStatus;
const M = (m: string): Metier => m as Metier;

// ── HIW-175 retest: one table per PL Number, each PL ALWAYS holds the same 5 métiers ──
// The 4 estimable métiers (H-DESIGN, H-SOFTWARE, H-TUNING, H-CUSTOMER) are always present;
// the 5th slot alternates per PL between H-PROJECT and H-NP. H-TESTING is NOT part of the
// project-line structure. The métier filter only offers the 4 estimable ones (FILTER_METIERS);
// H-NP / H-PROJECT show as grid rows but are not filterable.

interface MetierSlot {
  metier: Metier;
  code: string;
  eng: string;
  injection: string | null; // keep both null and non-null coverage for compatibility tests
}

const BASE_SLOTS: MetierSlot[] = [
  { metier: M('H-DESIGN'),   code: 'DES', eng: 'eng-1', injection: 'Direct Injection' },
  { metier: M('H-SOFTWARE'), code: 'SW',  eng: 'eng-3', injection: null },
  { metier: M('H-TUNING'),   code: 'TUN', eng: 'eng-5', injection: 'Direct Injection' },
  { metier: M('H-CUSTOMER'), code: 'CUS', eng: 'eng-9', injection: null },
];

const FIFTH_SLOT: Record<'project' | 'np', MetierSlot> = {
  project: { metier: M('H-PROJECT'), code: 'PRJ', eng: 'eng-7', injection: 'Direct Injection' },
  np:      { metier: M('H-NP'),      code: 'NP',  eng: 'eng-7', injection: 'Direct Injection' },
};

interface PlSpec {
  plNumber: string;
  plName: string;
  projectId: string;
  fifth: 'project' | 'np';
  /** Status for each of the 5 slots, in order [DES, SW, TUN, CUS, fifth]. */
  statuses: string[];
}

// 6 PL Numbers × 5 métiers = 30 lines. Statuses are spread so every status
// (To do / Draft / Estimated / Sent / Approved / Modification Requested) is represented.
const PL_SPECS: PlSpec[] = [
  { plNumber: 'PL-001', plName: 'Auth Platform',   projectId: 'P-AUTH',  fifth: 'project', statuses: ['To do', 'Draft', 'Estimated', 'Sent', 'Approved'] },
  { plNumber: 'PL-002', plName: 'Payments',        projectId: 'P-PAY',   fifth: 'np',      statuses: ['Draft', 'Estimated', 'Sent', 'Approved', 'Modification Requested'] },
  { plNumber: 'PL-003', plName: 'Marketing Tools', projectId: 'P-MKT',   fifth: 'project', statuses: ['Estimated', 'Sent', 'Approved', 'To do', 'Draft'] },
  { plNumber: 'PL-004', plName: 'Data Platform',   projectId: 'P-DATA',  fifth: 'np',      statuses: ['Sent', 'Approved', 'To do', 'Draft', 'Estimated'] },
  { plNumber: 'PL-005', plName: 'Mobile App',      projectId: 'P-MOB',   fifth: 'project', statuses: ['Approved', 'To do', 'Draft', 'Estimated', 'Sent'] },
  { plNumber: 'PL-006', plName: 'Infra Platform',  projectId: 'P-INFRA', fifth: 'np',      statuses: ['Modification Requested', 'To do', 'Draft', 'Estimated', 'Sent'] },
];

function buildLine(pl: PlSpec, slot: MetierSlot, status: string): ProjectLine {
  const estimated = status !== 'To do';
  const isMod = status === 'Modification Requested';
  return {
    id: `${pl.plNumber}-${slot.code}`,
    project_id: `${pl.projectId}-${slot.code}`,
    name: `${pl.plName} ${slot.metier}`,
    metier: slot.metier,
    status: S(status),
    updated_at: '2026-05-10T09:00:00Z',
    lineName: `${pl.plName} — ${slot.metier}`,
    projectName: pl.plName,
    plNumber: pl.plNumber,
    plName: pl.plName,
    assignedEngineerId: slot.eng,
    estimatedDays: estimated ? 12 : null,
    estimatedKEuro: estimated ? 10.2 : null,
    ...(isMod ? { rejectionComment: 'Review and re-estimate the flagged inductors.' } : {}),
    lastUpdatedBy: 'PMO',
    lastUpdatedAt: '2026-05-10T09:00:00Z',
    cycleId: 'cyc-2026h1',
    organType: 'Thermal Engine',
    energyFuelType: 'Gasoline',
    projectRanking: 'Mother',
    injectionSystem: slot.injection,
    spDate: '2026-01-01',
    requestType: 'New Project',
    client: 'Renault',
    market: 'Europe',
    allianceCode: `ALL-${pl.plNumber}`,
    vehicleCode: `VEH-${pl.plNumber}-${slot.code}`,
    standardEmissions: 'Euro 6',
    energy: 'Petrol',
    estimateType: 'Full',
    engineering: 'Internal',
    pcDate: '2026-04-01',
    coDate: '2026-08-01',
    sopDate: '2026-12-01',
    durationMonths: 6,
    description: `${slot.metier} scope for ${pl.plName}`,
  };
}

export const PROJECT_LINES: ProjectLine[] = PL_SPECS.flatMap((pl) => {
  const slots = [...BASE_SLOTS, FIFTH_SLOT[pl.fifth]];
  return slots.map((slot, i) => buildLine(pl, slot, pl.statuses[i]));
});
