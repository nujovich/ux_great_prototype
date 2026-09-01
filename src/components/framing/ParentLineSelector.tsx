interface Props {
  id: string;
  label: string;
  value: string;
  /** The active cycle's PL numbers, already excluding this row's own (§5.5). */
  options: string[];
  onChange(next: string): void;
}

/**
 * §5.5 — Parent Prog. Line. Constrained to real PL numbers of the cycle, with an
 * empty choice always available: not every line has a parent. Parent Ranking is
 * derived elsewhere (store selector) and never entered here.
 */
export function ParentLineSelector({ id, label, value, options, onChange }: Props) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium text-slate-500" htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      >
        <option value="">— None —</option>
        {options.map((pl) => (
          <option key={pl} value={pl}>{pl}</option>
        ))}
      </select>
    </div>
  );
}
