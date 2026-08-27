import { useState } from 'react';
import type { FramingLine } from '../../types/framing';
import type { FramingFieldDef } from '../../lib/framing/sections';
import { FRAMING_REFERENCE } from '../../fixtures/framingReference';
import { ParentLineSelector } from './ParentLineSelector';

export interface FieldProps {
  def: FramingFieldDef;
  value: unknown;
  /** §5.5 — supplied only for kind 'parentRef'. */
  parentOptions?: string[];
  onChange(field: keyof FramingLine, value: unknown): void;
}

const INPUT_CLASS =
  'mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500';

/**
 * §7.2 — one field, rendered from its schema definition.
 *
 * Renders NO error indicator and NO readiness state for any field, valid or not:
 * §6 is enforced server-side at Generate (HIW-463 AC#9).
 */
export function FramingField({ def, value, parentOptions, onChange }: FieldProps) {
  const id = `framing-field-${String(def.key)}`;
  const text = value === null || value === undefined ? '' : String(value);

  // Local echo for the plain text/date/number input below: it keeps every
  // keystroke visible even when the caller doesn't feed the parsed value
  // straight back as a new `value` prop on each change (e.g. debounced or
  // batched saves). Re-synced during render whenever the field's real value
  // changes from outside (undo, reload, another field's edit) — the
  // React-recommended way to adjust state from props without an effect.
  const [prevText, setPrevText] = useState(text);
  const [local, setLocal] = useState(text);
  if (text !== prevText) {
    setPrevText(text);
    setLocal(text);
  }

  if (def.kind === 'derived') {
    return (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-500">{def.label}</span>
        <span className="mt-1 rounded-md bg-slate-50 px-2 py-1.5 text-sm text-slate-700">
          {text}
        </span>
      </div>
    );
  }

  if (def.kind === 'parentRef') {
    return (
      <ParentLineSelector
        id={id}
        label={def.label}
        value={text}
        options={parentOptions ?? []}
        onChange={(next) => onChange(def.key, next)}
      />
    );
  }

  const label = (
    <label className="text-xs font-medium text-slate-500" htmlFor={id}>{def.label}</label>
  );

  if (def.kind === 'select') {
    const options = def.refList ? FRAMING_REFERENCE[def.refList] : [];
    return (
      <div className="flex flex-col">
        {label}
        <select
          id={id}
          className={INPUT_CLASS}
          value={text}
          disabled={def.readOnly}
          onChange={(e) => onChange(def.key, e.target.value)}
        >
          <option value="" />
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {label}
      <input
        id={id}
        type={def.kind === 'date' ? 'date' : def.kind === 'number' ? 'number' : 'text'}
        className={INPUT_CLASS}
        value={local}
        disabled={def.readOnly}
        onChange={(e) => {
          const raw = e.target.value;
          setLocal(raw);
          if (def.kind !== 'number') {
            onChange(def.key, raw);
            return;
          }
          onChange(def.key, raw.trim() === '' ? null : Number(raw));
        }}
      />
    </div>
  );
}
