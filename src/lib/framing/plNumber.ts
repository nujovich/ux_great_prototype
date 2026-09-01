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

/**
 * The family `code` belongs to, or null when it is not a PL Number at all.
 *
 * The two grammars are mutually exclusive (letter-letter-digit-digit vs
 * digit-digit-letter-letter), so at most one can match. This is the single
 * authority on "is this string a PL Number?" — real framing files put free
 * text in the column (`New`, `XXXX`, `to be open`), and that is not a code.
 */
export function familyOf(code: string): PlNumberFamily | null {
  if (decode(code, 'LLNN') !== null) return 'LLNN';
  if (decode(code, 'NNLL') !== null) return 'NNLL';
  return null;
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

/** Thrown when the upload's starting PL Number is not a code of either family. */
export class InvalidStartingPlNumberError extends Error {
  constructor(code: string) {
    super(`"${code}" is not a PL Number (expected LLNN like IF65, or NNLL like 07AB)`);
    this.name = 'InvalidStartingPlNumberError';
  }
}

/**
 * POC parity — `framing_file_functions.fill_xxxx_pl_numbers`.
 *
 * Every row is reassigned from `startingCode`, overwriting whatever the file
 * carried (a real code, a placeholder like `New`/`XXXX`/`to be open`, or
 * nothing). That overwrite is the point: upload upserts on PL Number, so any
 * value repeated down the column silently collapses those rows into one. The
 * POC sidesteps that by never trusting the column, and so do we.
 *
 * Unlike the POC's single counter, the §5.4 two-family split is preserved:
 * `startingCode` seeds its own family, and the other family continues from the
 * global max as `assignPlNumbers` would. A file of Renault rows — every real
 * framing file seen so far — behaves exactly like the POC.
 */
export function reassignPlNumbers<T extends { plNumber: string; client: string }>(
  rows: T[],
  startingCode: string,
  existingCodes: readonly string[],
): T[] {
  const startFamily = familyOf(startingCode);
  if (startFamily === null) throw new InvalidStartingPlNumberError(startingCode);

  const other: PlNumberFamily = startFamily === 'LLNN' ? 'NNLL' : 'LLNN';
  const next: Record<PlNumberFamily, number> = {
    [startFamily]: decode(startingCode, startFamily) as number,
    [other]: (maxOrdinal(existingCodes, other) ?? -1) + 1,
  } as Record<PlNumberFamily, number>;

  return rows.map((row) => {
    const family = familyFor(row.client);
    const plNumber = encode(next[family], family);
    next[family] += 1;
    return { ...row, plNumber };
  });
}

/** Guard for the upload's starting code, so callers need not know the grammar. */
export function assertStartingPlNumber(code: string): void {
  if (familyOf(code) === null) throw new InvalidStartingPlNumberError(code);
}

/**
 * The code `assignPlNumbers` would hand out next for `family` — what the upload
 * pre-fills its Starting PL Number with, so the default already respects
 * §5.4's global max and the user only types when overriding it.
 */
export function nextPlNumber(
  existingCodes: readonly string[],
  family: PlNumberFamily = 'LLNN',
): string {
  return encode((maxOrdinal(existingCodes, family) ?? -1) + 1, family);
}
