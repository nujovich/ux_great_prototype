/**
 * PL Number assignment — PRD §5.4.
 *
 * A file-provided PL number is kept verbatim. An empty one is generated from the
 * GLOBAL highest existing code of the row's client format family (all cycles, not
 * just the active one), incremented by one.
 *
 * Both families share one ordinal encoding:
 *
 *     ordinal = (l1 * 26 + l2) * 100 + nn
 *
 * Numbers occupy the low digits, so `+1` advances numbers first and rolls letters
 * only at `..99` — §5.4's rule for both layouts. Only the string layout differs.
 */

export type PlNumberFamily = 'LLNN' | 'NNLL';

/** 26 × 26 × 100 — ZZ99 / 99ZZ are the last valid values. */
export const FAMILY_CAPACITY = 26 * 26 * 100;

const LLNN_RE = /^([A-Za-z])([A-Za-z])(\d)(\d)$/;
const NNLL_RE = /^(\d)(\d)([A-Za-z])([A-Za-z])$/;

/** §5.4 — RG / Renault / Renault Group / contains "renault" / empty all mean Renault. */
export function isRenaultClient(client?: string | null): boolean {
  const c = (client ?? '').trim();
  if (c === '') return true;
  return /renault/i.test(c) || /^rg$/i.test(c);
}

export function familyFor(client?: string | null): PlNumberFamily {
  return isRenaultClient(client) ? 'LLNN' : 'NNLL';
}

function letterOrdinal(a: string, b: string): number {
  const l1 = a.toUpperCase().charCodeAt(0) - 65;
  const l2 = b.toUpperCase().charCodeAt(0) - 65;
  return l1 * 26 + l2;
}

/** Returns the ordinal of `code` within `family`, or null when it is not a member. */
export function decode(code: string, family: PlNumberFamily): number | null {
  const raw = (code ?? '').trim();
  if (family === 'LLNN') {
    const m = LLNN_RE.exec(raw);
    if (!m) return null;
    return letterOrdinal(m[1], m[2]) * 100 + Number(`${m[3]}${m[4]}`);
  }
  const m = NNLL_RE.exec(raw);
  if (!m) return null;
  return letterOrdinal(m[3], m[4]) * 100 + Number(`${m[1]}${m[2]}`);
}

export function encode(ordinal: number, family: PlNumberFamily): string {
  if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= FAMILY_CAPACITY) {
    throw new Error(
      `PL Number family ${family} exhausted: ordinal ${ordinal} is outside 0..${FAMILY_CAPACITY - 1}`,
    );
  }
  const nn = String(ordinal % 100).padStart(2, '0');
  const letters = Math.floor(ordinal / 100);
  const l1 = String.fromCharCode(65 + Math.floor(letters / 26));
  const l2 = String.fromCharCode(65 + (letters % 26));
  return family === 'LLNN' ? `${l1}${l2}${nn}` : `${nn}${l1}${l2}`;
}

/** Highest ordinal of `family` among `codes`, or null when the family is empty. */
function maxOrdinal(codes: readonly string[], family: PlNumberFamily): number | null {
  let max: number | null = null;
  for (const code of codes) {
    const ord = decode(code, family);
    if (ord !== null && (max === null || ord > max)) max = ord;
  }
  return max;
}

/**
 * §5.4 — returns a new array where every row with an empty `plNumber` carries a
 * freshly generated code. Rows within one call never collide: each family's
 * counter advances per assignment (`max + 1`, `max + 2`, …).
 */
export function assignPlNumbers<T extends { plNumber: string; client: string }>(
  rows: T[],
  existingCodes: readonly string[],
): T[] {
  const next: Record<PlNumberFamily, number> = {
    LLNN: (maxOrdinal(existingCodes, 'LLNN') ?? -1) + 1,
    NNLL: (maxOrdinal(existingCodes, 'NNLL') ?? -1) + 1,
  };

  return rows.map((row) => {
    if ((row.plNumber ?? '').trim() !== '') return { ...row };
    const family = familyFor(row.client);
    const plNumber = encode(next[family], family);
    next[family] += 1;
    return { ...row, plNumber };
  });
}
