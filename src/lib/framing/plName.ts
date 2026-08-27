import type { FramingLine } from '../../types/framing';

export type PlNameSource = Pick<
  FramingLine,
  | 'plNumber' | 'activityType' | 'allianceCode' | 'secondaryOrgan' | 'thirdOrgan'
  | 'fourthOrgan' | 'standardEmissions' | 'vehicleCode' | 'otherSpecifications'
  | 'drivetrain' | 'vehiclePhase' | 'projectRanking'
>;

/**
 * §5.3 writes components separated by `·`, which is documentation notation. The
 * authoritative join character lives in the legacy `create_gpm`
 * (functionalities.py:157-174) and is unconfirmed — see the plan's open items.
 */
export const PL_NAME_SEPARATOR = ' ';

const MBGM_RANKINGS = new Set(['M', 'B', 'GM']);
const DEFAULT_ACTIVITY_TYPE = 'MBTP';

function clean(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/** §5.3 — ranking-dependent composition. 4X2 is valid but hidden; only 4X4 appears. */
export function composePlName(row: PlNameSource): string {
  const ranking = clean(row.projectRanking).toUpperCase();
  const fourWheel = clean(row.drivetrain).toUpperCase() === '4X4' ? '4X4' : '';

  const components = MBGM_RANKINGS.has(ranking)
    ? [
        row.plNumber,
        clean(row.activityType) || DEFAULT_ACTIVITY_TYPE,
        row.allianceCode, row.secondaryOrgan, row.thirdOrgan, row.fourthOrgan,
        row.standardEmissions, row.vehicleCode, row.otherSpecifications,
        fourWheel, row.vehiclePhase,
      ]
    : [
        row.plNumber, row.vehicleCode, row.allianceCode,
        row.secondaryOrgan, row.thirdOrgan, row.fourthOrgan,
        row.standardEmissions, row.otherSpecifications,
        fourWheel, row.vehiclePhase,
      ];

  return components.map(clean).filter((c) => c !== '').join(PL_NAME_SEPARATOR);
}
