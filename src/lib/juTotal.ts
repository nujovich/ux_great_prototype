import type { JU } from '../types';

/** Per-JU total in its own unit: (Variable × Occurrence) + Fixed (§8). */
export function juTotal(ju: JU, occurrence: number): number {
  return (ju.variable ?? 0) * occurrence + (ju.fixed ?? 0);
}

/** A single-cran inductor renders a fixed label, not a dropdown (§7). */
export function shouldShowCranDropdown(cranCount: number): boolean {
  return cranCount > 1;
}
