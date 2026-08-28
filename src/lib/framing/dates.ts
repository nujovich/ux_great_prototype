/**
 * Framing-file date parsing (PRD §5.1 — every milestone is "Parsed to date
 * (week-code / dd-mm-yyyy tolerant)").
 *
 * Reproduces the POC's `parse_custom_date`
 * (poc_great/src/backend/framing_file_functions.py:749-822), rule for rule
 * and in the same order — order matters, since it's what stops an ambiguous
 * value like `03/04/2025` from having its day and month flipped. Output is
 * ISO `yyyy-mm-dd` rather than the POC's `dd-mm-yyyy`: our fields feed
 * `<input type="date">`, which requires ISO.
 *
 * Deliberately has no `new Date(value)` fallback and no date-library
 * dependency: a loose parse would read `03/04/2025` as March 4th — exactly
 * what the explicit-format step (rule 5) exists to prevent — and the repo
 * has no date library to reach for.
 */

const NULLISH_TOKENS = new Set(['', 'n/a', 'non défini', 'not defined', 'none']);

const MONTH_INDEX: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const MONTH_ALT = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
const MONTH_RANGE_RE = new RegExp(`^(${MONTH_ALT})\\s*-\\s*(${MONTH_ALT})\\s+(\\d{4})$`, 'i');

const WEEK_CODE_RE = /^w\d{4}$/i;
const CW_CODE_RE = /^cw\d{4}$/i;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** Rejects out-of-range day/month combinations (e.g. 31 February) rather than letting them roll over. */
function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Monday of "week N of year 20YY" under Python's `%W` convention (the one
 * the POC's `pd.to_datetime(f"{year}-W{week}-1", format="%Y-W%W-%w")` uses):
 * week numbering is Monday-first, week 1 begins on the year's first Monday,
 * and any days before that belong to week 0.
 *
 * FLAGGED ASSUMPTION: this is NOT ISO-8601 week numbering, which anchors on
 * each week's Thursday and can place early-January dates in the previous
 * year's final week. The two conventions can disagree by up to a few days
 * around a year boundary. We reproduce `%W` verbatim — the real files' week
 * codes were themselves produced by the POC's `%W`-based logic — so a
 * milestone landing a few days off right at a year boundary is this
 * divergence, not a parsing bug.
 */
function mondayOfWeek(year: number, week: number): { year: number; month: number; day: number } {
  const jan1Weekday = new Date(Date.UTC(year, 0, 1)).getUTCDay(); // 0=Sun..6=Sat
  const daysToFirstMonday = jan1Weekday === 1 ? 0 : (8 - jan1Weekday) % 7;
  const monday = new Date(Date.UTC(year, 0, 1 + daysToFirstMonday + (week - 1) * 7));
  return { year: monday.getUTCFullYear(), month: monday.getUTCMonth() + 1, day: monday.getUTCDate() };
}

/** Python strptime's `%y` convention: 00-68 → 20xx, 69-99 → 19xx. */
function expandTwoDigitYear(yy: number): number {
  return yy <= 68 ? 2000 + yy : 1900 + yy;
}

type ExplicitFormat = {
  re: RegExp;
  // Index (into the regex match) of day, month, year groups, and whether the
  // year group is two digits.
  order: (m: RegExpExecArray) => { day: number; month: number; year: number };
};

/**
 * Tried in exactly this order — it is what stops an ambiguous date like
 * `03/04/2025` from being read month-first. Each pattern is distinguished by
 * separator and digit-group width, so at most one matches a given value.
 */
const EXPLICIT_FORMATS: ExplicitFormat[] = [
  // yyyy-mm-dd
  {
    re: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    order: (m) => ({ year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }),
  },
  // dd/mm/yyyy
  {
    re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    order: (m) => ({ day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) }),
  },
  // dd-mm-yyyy
  {
    re: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    order: (m) => ({ day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) }),
  },
  // dd/mm/yy
  {
    re: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
    order: (m) => ({ day: Number(m[1]), month: Number(m[2]), year: expandTwoDigitYear(Number(m[3])) }),
  },
  // dd-mm-yy
  {
    re: /^(\d{1,2})-(\d{1,2})-(\d{2})$/,
    order: (m) => ({ day: Number(m[1]), month: Number(m[2]), year: expandTwoDigitYear(Number(m[3])) }),
  },
];

function tryExplicitFormats(value: string): string | null {
  for (const format of EXPLICIT_FORMATS) {
    const m = format.re.exec(value);
    if (!m) continue;
    const { year, month, day } = format.order(m);
    if (isValidDate(year, month, day)) return toIso(year, month, day);
  }
  return null;
}

/**
 * Parses one framing-file date cell into ISO `yyyy-mm-dd`, or `null` when
 * the value is empty, a recognized "not applicable" token, or unparseable.
 * Rule order matches the POC's `parse_custom_date` and must not be reordered.
 */
export function parseCustomDate(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const value = String(raw).trim();
  if (value === '' || NULLISH_TOKENS.has(value.toLowerCase())) return null;

  // W2431 — year 20 + digits 1-2, week = digits 3-4.
  if (WEEK_CODE_RE.test(value)) {
    const year = Number(`20${value.slice(1, 3)}`);
    const week = Number(value.slice(3, 5));
    const { year: y, month, day } = mondayOfWeek(year, week);
    return toIso(y, month, day);
  }

  // cw2730 — year 20 + digits 1-2, week = digits 3-4 (case-insensitive).
  if (CW_CODE_RE.test(value)) {
    const year = Number(`20${value.slice(2, 4)}`);
    const week = Number(value.slice(4, 6));
    const { year: y, month, day } = mondayOfWeek(year, week);
    return toIso(y, month, day);
  }

  // "Jan - Feb 2025" — first month, day 1 of that year.
  const rangeMatch = MONTH_RANGE_RE.exec(value);
  if (rangeMatch) {
    const month = MONTH_INDEX[rangeMatch[1].toLowerCase()];
    const year = Number(rangeMatch[3]);
    return toIso(year, month, 1);
  }

  return tryExplicitFormats(value);
}
