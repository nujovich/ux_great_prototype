import { useFramingStore, effectiveLine, parentOptions } from '../../store/framingStore';
import { sectionsForTrack } from '../../lib/framing/sections';
import { FramingFormSection } from './FramingFormSection';

interface Props {
  plNumber: string;
}

/**
 * §7.2 — the sectioned detail form. All editing happens here; the table never
 * holds an editable cell. Edits stay in page state until Save (ADR-008).
 *
 * Renders NO validation state of any kind (HIW-463 AC#9).
 */
export function FramingDetailForm({ plNumber }: Props) {
  const lines = useFramingStore((s) => s.lines);
  const edits = useFramingStore((s) => s.edits);
  const editField = useFramingStore((s) => s.editField);

  const line = effectiveLine({ lines, edits }, plNumber);
  if (!line) return null;

  const options = parentOptions({ lines }, plNumber);
  const sections = sectionsForTrack(line.track);

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <FramingFormSection
          key={section.id}
          section={section}
          line={line}
          parentOptions={options}
          onChange={(field, value) => editField(plNumber, field, value)}
          defaultOpen={index === 0}
        />
      ))}
    </div>
  );
}
