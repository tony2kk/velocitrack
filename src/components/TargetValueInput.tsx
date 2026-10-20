import { useRef, useState } from 'react';
import type { UnitSystem } from '../domain/model';
import {
  TARGET_HINTS,
  TARGET_LABELS,
  targetText,
  targetUnit,
  type TargetField,
} from '../domain/targetMeasurement';

/** Keep incomplete typing local; commit only changed text so untouched rounded values retain precision. */
export function TargetValueInput({
  field,
  value,
  units,
  manual = false,
  onCommit,
  compact = false,
}: {
  field: TargetField;
  value: number | null;
  units: UnitSystem;
  manual?: boolean;
  onCommit: (field: TargetField, text: string) => void;
  compact?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  /** Blur and Enter share a single commit path; resetting the draft prevents a second write. */
  function commit() {
    if (pending.current === null) return;
    const value = pending.current;
    pending.current = null;
    onCommit(field, value);
    setText(null);
  }
  return (
    <label
      className={`field target-value ${compact ? 'target-value-compact' : ''}`}
      title={TARGET_HINTS[field]}
    >
      <span>
        {TARGET_LABELS[field]} ({targetUnit(units).label}){manual && <small> · Manual</small>}
      </span>
      <input
        type="number"
        step="any"
        min={field === 'groupSize' ? 0 : undefined}
        value={text ?? targetText(value, units)}
        onChange={(event) => {
          pending.current = event.target.value;
          setText(event.target.value);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            pending.current = null;
            setText(null);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
