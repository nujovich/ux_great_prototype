import type { AllocationRow } from '../types';

export interface Subtotal {
  totalFte: number;
  totalKe: number;
  totalBh: number; // stubbed (FINAL-01)
  totalKm: number; // stubbed (FINAL-01)
  fteByYear: Record<string, number>;
  keByYear: Record<string, number>;
  bhByYear: Record<string, number>; // stubbed
  kmByYear: Record<string, number>; // stubbed
}

export interface CostTypeNode { costType: string; rows: AllocationRow[]; subtotal: Subtotal; }
export interface SocieteNode { societe: string; costTypes: CostTypeNode[]; subtotal: Subtotal; }
export interface MetierNode { metier: string; societes: SocieteNode[]; subtotal: Subtotal; }
export interface PlNode { plNumber: string; plName: string; metiers: MetierNode[]; subtotal: Subtotal; }

function emptySubtotal(years: string[]): Subtotal {
  const zero = () => Object.fromEntries(years.map((y) => [y, 0]));
  return {
    totalFte: 0, totalKe: 0, totalBh: 0, totalKm: 0,
    fteByYear: zero(), keByYear: zero(), bhByYear: zero(), kmByYear: zero(),
  };
}

function accumulate(into: Subtotal, row: AllocationRow, years: string[]): void {
  // totalFte comes from the pre-computed row.totalFte (source of truth);
  // totalKe is derived here by summing keByYear over the declared years.
  into.totalFte += row.totalFte ?? 0;
  for (const y of years) {
    const fte = row.fteByYear[y] ?? 0;
    const ke = row.keByYear[y] ?? 0;
    into.fteByYear[y] += fte;
    into.keByYear[y] += ke;
    into.totalKe += ke;
    // bh/km remain 0 until FINAL-01
  }
}

function sumChildren(subs: Subtotal[], years: string[]): Subtotal {
  const out = emptySubtotal(years);
  for (const s of subs) {
    out.totalFte += s.totalFte;
    out.totalKe += s.totalKe;
    for (const y of years) {
      out.fteByYear[y] += s.fteByYear[y] ?? 0;
      out.keByYear[y] += s.keByYear[y] ?? 0;
    }
  }
  return out;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const bucket = m.get(k);
    if (bucket) bucket.push(it);
    else m.set(k, [it]);
  }
  return m;
}

/** Build the PL → Métier → Society → Cost Type → JU tree with subtotals at each level. */
export function buildPlTree(rows: AllocationRow[], years: string[]): PlNode[] {
  const plMap = groupBy(rows, (r) => r.plNumber);
  const pls: PlNode[] = [];
  for (const [plNumber, plRows] of plMap) {
    const metierMap = groupBy(plRows, (r) => r.metier);
    const metiers: MetierNode[] = [];
    for (const [metier, mRows] of metierMap) {
      const socMap = groupBy(mRows, (r) => r.societe ?? '—');
      const societes: SocieteNode[] = [];
      for (const [societe, sRows] of socMap) {
        const ctMap = groupBy(sRows, (r) => r.costType);
        const costTypes: CostTypeNode[] = [];
        for (const [costType, cRows] of ctMap) {
          const sub = emptySubtotal(years);
          cRows.forEach((r) => accumulate(sub, r, years));
          costTypes.push({ costType, rows: cRows, subtotal: sub });
        }
        societes.push({ societe, costTypes, subtotal: sumChildren(costTypes.map((c) => c.subtotal), years) });
      }
      metiers.push({ metier, societes, subtotal: sumChildren(societes.map((s) => s.subtotal), years) });
    }
    pls.push({
      plNumber, plName: plRows[0].plName, metiers, // all rows under a plNumber share the same plName by construction
      subtotal: sumChildren(metiers.map((m) => m.subtotal), years),
    });
  }
  return pls.sort((a, b) => a.plNumber.localeCompare(b.plNumber));
}

/** Filter a PL tree by a PL number/name search query (case-insensitive). */
export function filterPlTree(tree: PlNode[], query: string): PlNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return tree;
  return tree.filter(
    (p) => p.plNumber.toLowerCase().includes(q) || p.plName.toLowerCase().includes(q),
  );
}
