import { useRef, useState } from 'react';
import type { UnitSystem } from '../../domain/model';
import { targetText, targetUnit } from '../../domain/targetMeasurement';

/** Commit a reference length on blur/Enter; untouched display rounding never changes stored precision. */
export function CalibrationInput({
  value,
  units,
  onCommit,
}: {
  value: number | null;
  units: UnitSystem;
  onCommit: (text: string) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  /** Consume the pending edit once, even when Enter also triggers blur. */
  function commit() {
    if (pending.current === null) return;
    const next = pending.current;
    pending.current = null;
    onCommit(next);
    setText(null);
  }
  return (
    <label
      className="field"
      title="The real distance between the two reference endpoints, such as the target diameter."
    >
      <span>Reference length ({targetUnit(units).label})</span>
      <input
        type="number"
        min="0"
        step="any"
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
