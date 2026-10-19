// @vitest-environment jsdom
import { useState } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNotification } from '../src/hooks/useNotification';
import { useShotSelection } from '../src/hooks/useShotSelection';
import { SeriesNavigator } from '../src/components/SeriesNavigator';
import { ShotTable } from '../src/components/ShotTable';
import { RefreshProgress } from '../src/components/RefreshProgress';
import { series, shot } from './fixtures/synthetic';
import type { Series, Shot } from '../src/domain/model';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('notification lifetime', () => {
  it('dismisses after ten seconds and resets the deadline for the same message', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(useNotification);
    act(() => result.current.showMessage('Imported.'));
    act(() => vi.advanceTimersByTime(9_999));
    expect(result.current.message).toBe('Imported.');
    act(() => result.current.showMessage('Imported.'));
    act(() => vi.advanceTimersByTime(9_999));
    expect(result.current.message).toBe('Imported.');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.message).toBe('');
    act(() => result.current.showMessage('Another import.'));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('allows immediate manual dismissal without a stale timer clearing the next message', () => {
    vi.useFakeTimers();
    const { result } = renderHook(useNotification);
    act(() => result.current.showMessage('First'));
    act(() => vi.advanceTimersByTime(5_000));
    act(() => result.current.dismissMessage());
    expect(result.current.message).toBe('');
    act(() => result.current.showMessage('Next'));
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.message).toBe('Next');
  });
});

describe('session shot selection', () => {
  it('retains deselections across hiding/reselecting series and refresh, while new shots start selected', () => {
    const initialProps = { shots: [shot({ id: 'one' }), shot({ id: 'two' })], series: [series()] };
    const { result, rerender, unmount } = renderHook(
      ({ shots, series }) => useShotSelection(shots, series),
      { initialProps },
    );
    expect(result.current.selectedShots).toHaveLength(2);
    act(() => result.current.toggleShot('one', false));
    rerender({ ...initialProps, series: [] });
    expect(result.current.selectedShots).toHaveLength(0);
    rerender({ shots: [...initialProps.shots, shot({ id: 'new' })], series: initialProps.series });
    expect(result.current.selectedShots.map((item) => item.id)).toEqual(['new', 'two']);
    unmount();
    const fresh = renderHook(() => useShotSelection(initialProps.shots, initialProps.series));
    expect(fresh.result.current.selectedShots).toHaveLength(2);
  });
});

/** Exercise real navigation/table components sharing state as they do in the workspace. */
function ShotWorkspace({ shots, groups }: { shots: Shot[]; groups: Series[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(() => new Set());
  const selection = useShotSelection(
    shots,
    groups.filter((item) => selected.includes(item.id)),
    invalid,
  );
  return (
    <>
      <SeriesNavigator
        series={groups}
        shots={shots}
        selected={selected}
        catalogNames={new Map()}
        sourceNames={new Map()}
        onToggleSeries={(id, checked) =>
          setSelected((current) =>
            checked ? [...current, id] : current.filter((value) => value !== id),
          )
        }
      />
      <ShotTable
        shots={shots.filter((shot) => selected.includes(shot.seriesId))}
        hiddenShots={selection.hiddenShots}
        onToggleShot={selection.toggleShot}
        onToggleShots={selection.toggleShots}
        invalidShots={invalid}
        onInvalidateShot={(id, removed) => {
          setInvalid((current) => {
            const next = new Set(current);
            if (removed) next.add(id);
            else next.delete(id);
            return next;
          });
          if (!removed) selection.toggleShot(id, true);
        }}
        series={groups}
        activeShotId={active}
        onHoverShot={setActive}
      />
    </>
  );
}

describe('linked shot controls', () => {
  it('invalidates with disabled Analyze and Undo, and bulk selection covers other pages but skips invalid rows', () => {
    render(
      <ShotWorkspace
        shots={Array.from({ length: 101 }, (_, index) =>
          shot({ id: String(index), number: index + 1 }),
        )}
        groups={[series()]}
      />,
    );
    fireEvent.click(screen.getByLabelText('Select series Synthetic series'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Mark invalid shot 1 in Synthetic series' }),
    );
    const first = screen.getByLabelText('Select shot 1 in Synthetic series') as HTMLInputElement;
    expect(first.disabled).toBe(true);
    expect(first.checked).toBe(false);
    expect(first.closest('tr')?.classList.contains('shot-invalid')).toBe(true);
    fireEvent.click(screen.getByLabelText('Select shot 2 in Synthetic series'));
    expect((screen.getByLabelText('Analyze all shots') as HTMLInputElement).indeterminate).toBe(
      true,
    );
    fireEvent.click(screen.getByLabelText('Analyze all shots'));
    expect((screen.getByLabelText('Analyze all shots') as HTMLInputElement).checked).toBe(true);
    expect(first.checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(
      (screen.getByLabelText('Select shot 101 in Synthetic series') as HTMLInputElement).checked,
    ).toBe(true);
    fireEvent.click(screen.getByLabelText('Analyze all shots'));
    expect(
      (screen.getByLabelText('Select shot 101 in Synthetic series') as HTMLInputElement).checked,
    ).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(
      (screen.getByLabelText('Select shot 2 in Synthetic series') as HTMLInputElement).checked,
    ).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Restore shot 1 in Synthetic series' }));
    const restored = screen.getByLabelText('Select shot 1 in Synthetic series') as HTMLInputElement;
    expect(restored.disabled).toBe(false);
    expect(restored.checked).toBe(true);
    expect(restored.closest('tr')?.classList.contains('shot-invalid')).toBe(false);
  });
  it('keeps deselected rows available in the table and restores choices after reselecting series', () => {
    render(
      <ShotWorkspace
        shots={[shot({ id: 'one' }), shot({ id: 'two', number: 2 })]}
        groups={[series()]}
      />,
    );
    expect(screen.queryByRole('group', { name: 'Shots in Synthetic series' })).toBeNull();
    const selectSeries = screen.getByLabelText('Select series Synthetic series');
    fireEvent.click(selectSeries);
    const first = screen.getByLabelText('Select shot 1 in Synthetic series') as HTMLInputElement;
    expect(first.checked).toBe(true);
    fireEvent.click(first);
    expect(screen.getByRole('row', { name: 'Shot 1 in Synthetic series' }).textContent).toContain(
      'Not selected',
    );
    expect(screen.getByRole('row', { name: 'Shot 2 in Synthetic series' })).toBeTruthy();
    fireEvent.click(selectSeries);
    fireEvent.click(selectSeries);
    expect(
      (screen.getByLabelText('Select shot 1 in Synthetic series') as HTMLInputElement).checked,
    ).toBe(false);
  });

  it('links hover both ways using identities even when shot numbers match', () => {
    render(
      <ShotWorkspace
        shots={[shot({ id: 'one' }), shot({ id: 'two', seriesId: 'second' })]}
        groups={[series(), series({ id: 'second', name: 'Second' })]}
      />,
    );
    fireEvent.click(screen.getByLabelText('Select series Synthetic series'));
    fireEvent.click(screen.getByLabelText('Select series Second'));
    const first = screen.getByLabelText('Select shot 1 in Synthetic series').closest('tr')!;
    const second = screen.getByLabelText('Select shot 1 in Second').closest('tr')!;
    const firstRow = screen.getByRole('row', { name: 'Shot 1 in Synthetic series' });
    const secondRow = screen.getByRole('row', { name: 'Shot 1 in Second' });
    fireEvent.mouseEnter(second);
    expect(secondRow.classList.contains('shot-highlighted')).toBe(true);
    expect(firstRow.classList.contains('shot-highlighted')).toBe(false);
    fireEvent.mouseLeave(second);
    fireEvent.mouseEnter(firstRow);
    expect(first.classList.contains('shot-highlighted')).toBe(true);
    expect(second.classList.contains('shot-highlighted')).toBe(false);
    fireEvent.mouseLeave(firstRow);
    expect(first.classList.contains('shot-highlighted')).toBe(false);
    fireEvent.focus(screen.getByLabelText('Select shot 1 in Second'));
    expect(secondRow.classList.contains('shot-highlighted')).toBe(true);
  });

  it('reveals a hovered shot on a later table page and keeps that page after hover ends', () => {
    const shots = Array.from({ length: 101 }, (_, index) =>
      shot({ id: String(index), number: index + 1 }),
    );
    const props = {
      shots,
      series: [series()],
      activeShotId: null as string | null,
      onHoverShot: vi.fn(),
    };
    const { rerender } = render(<ShotTable {...props} />);
    expect(screen.queryByRole('row', { name: 'Shot 101 in Synthetic series' })).toBeNull();
    rerender(<ShotTable {...props} activeShotId="100" />);
    expect(
      screen
        .getByRole('row', { name: 'Shot 101 in Synthetic series' })
        .classList.contains('shot-highlighted'),
    ).toBe(true);
    rerender(<ShotTable {...props} />);
    expect(screen.getByText('Page 2 of 2')).toBeTruthy();
  });
});

describe('refresh progress', () => {
  it('updates the active source and can continue in the background', () => {
    // jsdom does not implement the browser's native dialog top layer.
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.setAttribute('open', '');
        },
      },
      close: {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.removeAttribute('open');
        },
      },
    });
    const { rerender } = render(<RefreshProgress sourceNames={['First source']} />);
    expect(within(screen.getByRole('dialog')).getByRole('status').textContent).toBe(
      'Loading First source...',
    );
    rerender(<RefreshProgress sourceNames={['Next source']} />);
    expect(screen.getByRole('status').textContent).toBe('Loading Next source...');
    fireEvent.click(screen.getByRole('button', { name: 'Continue in background' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
