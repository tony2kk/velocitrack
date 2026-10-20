import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { TableColumn } from '../domain/table';

/** Compact table label with a full explanation available by hover, keyboard focus or touch. */
export function ColumnLabel({ column }: { column: TableColumn }) {
  const tooltipId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const visible = position !== null;

  /** Cancel a pending pointer-leave dismissal and close without changing column sorting. */
  const hide = useCallback(() => {
    clearTimeout(hideTimer.current);
    setPosition(null);
  }, []);

  /** Use a portal so table scrolling cannot clip the explanation; keep it within the viewport. */
  function show() {
    clearTimeout(hideTimer.current);
    const bounds = trigger.current?.getBoundingClientRect();
    if (!bounds) return;
    const width = Math.min(300, window.innerWidth - 16);
    const below = window.innerHeight - bounds.bottom;
    const placeBelow = below >= 160 || below >= bounds.top;
    setPosition({
      width,
      left: Math.max(8, Math.min(bounds.left, window.innerWidth - width - 8)),
      ...(placeBelow
        ? { top: bounds.bottom + 6 }
        : { bottom: window.innerHeight - bounds.top + 6 }),
      maxHeight: Math.max(60, (placeBelow ? below : bounds.top) - 16),
    });
  }

  /** Allow the pointer to cross the small gap into the tooltip; focused labels stay explained. */
  function scheduleHide() {
    if (document.activeElement === trigger.current) return;
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hide, 150);
  }

  useEffect(() => () => clearTimeout(hideTimer.current), []);
  useEffect(() => {
    if (!visible) return;
    /** Close touch-opened help on an outside tap, without interfering with the tapped control. */
    function outside(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!trigger.current?.contains(target) && !tooltip.current?.contains(target)) hide();
    }
    /** A moved table invalidates the anchor; scrolling the explanation itself remains possible. */
    function scroll(event: Event) {
      if (!tooltip.current?.contains(event.target as Node)) hide();
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', hide);
    };
  }, [visible, hide]);

  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="column-label"
        aria-label={`About ${column.label}`}
        aria-describedby={visible ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={hide}
        onClick={show}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            hide();
          }
        }}
      >
        <span>{column.heading ?? column.label}</span>
        {column.unit && <span className="column-unit">{column.unit}</span>}
      </button>
      {position &&
        createPortal(
          <div
            id={tooltipId}
            ref={tooltip}
            role="tooltip"
            className="column-tooltip"
            style={position}
            onMouseEnter={() => clearTimeout(hideTimer.current)}
            onMouseLeave={scheduleHide}
          >
            <strong>{column.label}</strong>
            {column.description && <span>{column.description}</span>}
          </div>,
          document.body,
        )}
    </>
  );
}
