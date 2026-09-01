import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { FramingLine } from '../../types/framing';
import type { FramingSectionDef } from '../../lib/framing/sections';
import { useT } from '../../i18n/useT';
import { FramingField } from './FramingField';

interface Props {
  section: FramingSectionDef;
  line: FramingLine;
  parentOptions: string[];
  onChange(field: keyof FramingLine, value: unknown): void;
  defaultOpen?: boolean;
}

/**
 * §7.2 — one collapsible section. Renders no section-level error state
 * (HIW-463 AC#9). An empty `fields` array renders a header only — §5.6.7's
 * Prototype Details and §15.3's RFI placeholder both rely on that.
 */
export function FramingFormSection({ section, line, parentOptions, onChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const t = useT();

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {t(section.labelKey)}
      </button>
      {open && section.fields.length > 0 && (
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.fields
            .filter((def) => !def.showWhen || def.showWhen(line))
            .map((def) => (
              <FramingField
                key={String(def.key)}
                def={def}
                value={line[def.key]}
                parentOptions={parentOptions}
                onChange={onChange}
              />
            ))}
        </div>
      )}
    </section>
  );
}
