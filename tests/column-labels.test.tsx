// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColumnLabel } from '../src/components/ColumnLabel';
import { ShotTable } from '../src/components/ShotTable';
import { availableQuantities } from '../src/domain/analysis';
import { tableColumns } from '../src/domain/table';
import { series, shot } from './fixtures/synthetic';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('compact table headings', () => {
  it('exposes full meaning on hover, focus and tap without invoking sort', () => {
    vi.useFakeTimers();
    render(
      <ColumnLabel
        column={{
          id: 'velocity',
          label: 'Muzzle velocity (m/s)',
          heading: 'V₀',
          unit: 'm/s',
          description: 'Recorded muzzle velocity for this shot.',
        }}
      />,
    );
    const label = screen.getByRole('button', { name: 'About Muzzle velocity (m/s)' });
    fireEvent.mouseEnter(label);
    expect(screen.getByRole('tooltip').textContent).toContain('Recorded muzzle velocity');
    expect(label.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
    fireEvent.mouseLeave(label);
    act(() => vi.advanceTimersByTime(160));
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.focus(label);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.keyDown(label, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.click(label);
    expect(screen.getByRole('tooltip')).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.focus(label);
    fireEvent.scroll(document);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('keeps custom names intact, units explicit and sorting bound to the same stored identity', () => {
    const onSort = vi.fn();
    const props = {
      shots: [shot()],
      series: [series()],
      activeShotId: null,
      onHoverShot: vi.fn(),
      onSort,
      fields: [{ id: 'custom', name: 'Mass (sample)', type: 'weight-grams' as const, order: 0 }],
      columnIds: ['velocity', 'g1', 'g7', 'field:custom', 'source:weatherData.windSpeed'],
    };
    const { rerender } = render(<ShotTable {...props} unitSystem="metric" />);
    const velocity = screen.getByRole('columnheader', { name: 'Muzzle velocity (m/s)' });
    expect(within(velocity).getByText('V₀')).toBeTruthy();
    expect(within(velocity).getByText('m/s')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'G1' }).textContent).toBe('G1');
    expect(screen.getByRole('columnheader', { name: 'G7' }).textContent).toBe('G7');
    expect(screen.getByRole('columnheader', { name: 'Mass (sample) (g)' }).textContent).toBe(
      'Mass (sample)g',
    );
    expect(
      within(screen.getByRole('columnheader', { name: 'Wind Speed (source units)' })).getByText(
        'source units',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'About Muzzle velocity (m/s)' }));
    expect(onSort).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Muzzle velocity (m/s)' }));
    expect(onSort).toHaveBeenCalledWith({ columnId: 'velocity', direction: 'asc' });
    rerender(<ShotTable {...props} unitSystem="imperial" />);
    expect(
      within(screen.getByRole('columnheader', { name: 'Muzzle velocity (ft/s)' })).getByText(
        'ft/s',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Mass (sample) (g)' })).toBeTruthy();
  });

  it('preserves column identities and units while distinguishing string summaries from shots', () => {
    const quantities = availableQuantities([shot()], [series()], [], [], 'metric', true);
    const columns = tableColumns([], quantities, 'metric');
    const deviation = columns.find(
      (column) => column.id === 'source:statistics.standardDeviation',
    )!;
    expect(deviation.heading).toBe('String SD');
    expect(deviation.unit).toBe('m/s');
    expect(deviation.description).toContain('not recalculated from the current selection');
    const offset = columns.find((column) => column.id === 'target:verticalOffset')!;
    expect(offset.unit).toBe('cm');
    expect(offset.description).toContain('Positive upward');
    expect(columns.find((column) => column.id === 'g1')?.unit).toBeUndefined();
  });
});
