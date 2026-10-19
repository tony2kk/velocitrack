// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisPanel } from '../src/components/AnalysisPanel';
import { ProfileDialog } from '../src/components/ProfileDialog';
import { ColumnPicker } from '../src/components/ColumnPicker';
import { StringInfo } from '../src/components/StringInfo';
import { ShotTable } from '../src/components/ShotTable';
import { useTheme } from '../src/hooks/useTheme';
import { defaultProfile } from '../src/domain/model';
import { db } from '../src/storage/database';
import { saveAnalysis } from '../src/storage/analysis';
import { loadWorkspace, saveProfile } from '../src/storage/workspace';
import { series, shot } from './fixtures/synthetic';

vi.mock('../src/components/MeasurementChart', () => ({ default: () => <div>Chart canvas</div> }));
beforeEach(async () => {
  await db.open();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn();
});
afterEach(async () => {
  cleanup();
  await db.delete();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('persistent analysis controls', () => {
  it('offers sorting beside every header except Shot, persists it and restores row order', async () => {
    const props = {
      series: [series()],
      shots: [
        shot({ id: 'a', number: 1, muzzleVelocity: 200 }),
        shot({ id: 'b', number: 2, muzzleVelocity: 100 }),
      ],
      view: 'chart' as const,
      activeShotId: null,
      onHoverShot: vi.fn(),
    };
    const { rerender } = render(<AnalysisPanel {...props} profile={defaultProfile()} />);
    expect(screen.queryByRole('button', { name: /^Sort by Shot$/ })).toBeNull();
    expect(screen.getByRole('columnheader', { name: /String/ }).getAttribute('aria-sort')).toBe(
      'ascending',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Muzzle velocity (ft/s)' }));
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.tableSort).toEqual({
        columnId: 'velocity',
        direction: 'asc',
      }),
    );
    rerender(<AnalysisPanel {...props} profile={(await loadWorkspace()).profile} />);
    expect(
      screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.getAttribute('aria-label')),
    ).toEqual(['Shot 2 in Synthetic series', 'Shot 1 in Synthetic series']);
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Muzzle velocity (ft/s)' }));
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.tableSort?.direction).toBe('desc'),
    );
    rerender(<AnalysisPanel {...props} profile={(await loadWorkspace()).profile} />);
    expect(screen.getAllByRole('row')[1]?.getAttribute('aria-label')).toBe(
      'Shot 1 in Synthetic series',
    );
  });
  it('highlights every contributor row while retaining exact row hover identities', () => {
    const onHoverShot = vi.fn();
    render(
      <ShotTable
        shots={[shot({ id: 'a' }), shot({ id: 'b', number: 2 }), shot({ id: 'c', number: 3 })]}
        series={[series()]}
        activeShotId="a"
        activeShotIds={['a', 'b']}
        onHoverShot={onHoverShot}
      />,
    );
    expect(document.querySelectorAll('.shot-highlighted')).toHaveLength(2);
    fireEvent.mouseEnter(screen.getByRole('row', { name: 'Shot 3 in Synthetic series' }));
    expect(onHoverShot).toHaveBeenLastCalledWith('c');
  });
  it('reorders from the pointer handle and ignores drops outside the panel rows', () => {
    vi.stubGlobal('PointerEvent', MouseEvent);
    const change = vi.fn();
    render(
      <ColumnPicker
        available={[
          { id: 'series', label: 'Series' },
          { id: 'shot', label: 'Shot' },
          { id: 'g1', label: 'G1' },
        ]}
        selected={['series', 'shot', 'g1']}
        onChange={change}
      />,
    );
    const rows = [...document.querySelectorAll('.column-option')];
    rows.forEach((row, index) =>
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        right: 400,
        top: index * 40,
        bottom: (index + 1) * 40,
      } as DOMRect),
    );
    const handle = screen.getByRole('button', { name: 'Drag G1 to reorder', hidden: true });
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    fireEvent.pointerDown(handle, { clientX: 20, clientY: 100 });
    fireEvent.pointerUp(handle, { clientX: 600, clientY: 20 });
    expect(change).not.toHaveBeenCalled();
    fireEvent.pointerDown(handle, { clientX: 20, clientY: 100 });
    fireEvent.pointerMove(handle, { clientX: 20, clientY: 20 });
    expect(screen.getByRole('status').textContent).toContain('G1');
    expect(
      document
        .querySelector('.column-drop-marker')
        ?.closest('[data-column-id]')
        ?.getAttribute('data-column-id'),
    ).toBe('series');
    fireEvent.pointerUp(handle, { clientX: 20, clientY: 20 });
    expect(change).toHaveBeenCalledWith(['g1', 'series', 'shot']);
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('retains configured source columns when the selected string has no value', () => {
    render(
      <ShotTable
        series={[series()]}
        shots={[shot()]}
        activeShotId={null}
        onHoverShot={vi.fn()}
        columnIds={['source:weatherData.pressure']}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Pressure (source units)' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '—' })).toBeTruthy();
  });
  it('offers measured distance velocity even without a separate muzzle reading', () => {
    render(
      <AnalysisPanel
        series={[series()]}
        shots={[shot({ muzzleVelocity: null, distances: [0, 10], velocities: [100, 90] })]}
        view="chart"
        activeShotId={null}
        onHoverShot={vi.fn()}
        profile={defaultProfile()}
      />,
    );
    expect(
      (screen.getByRole('option', { name: 'Velocity (ft/s)' }) as HTMLOptionElement).disabled,
    ).toBe(false);
  });
  it('saves each analysis separately, fixes incompatible axes and restores choices after remount', async () => {
    const props = {
      series: [series()],
      shots: [shot({ ballisticCoefficientG1: 0.2 })],
      view: 'chart' as const,
      activeShotId: null,
      onHoverShot: vi.fn(),
    };
    const { rerender, unmount } = render(<AnalysisPanel {...props} profile={defaultProfile()} />);
    fireEvent.change(screen.getByLabelText('Chart type'), { target: { value: 'shot' } });
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.analysis?.simple.axis).toBe('shot'),
    );
    rerender(<AnalysisPanel {...props} profile={(await loadWorkspace()).profile} />);
    fireEvent.change(screen.getByLabelText('Chart quantity'), { target: { value: 'g1' } });
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.analysis?.simple.quantity).toBe('g1'),
    );
    rerender(<AnalysisPanel {...props} profile={(await loadWorkspace()).profile} />);
    fireEvent.change(screen.getByLabelText('Chart type'), { target: { value: 'distance' } });
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.analysis?.simple.quantity).toBe('velocity'),
    );
    await saveAnalysis('dual', { axis: 'shot', quantity: 'g1', secondary: 'velocity' });
    await saveAnalysis('compare', { axis: 'shot', quantity: 'g1' });
    expect((await loadWorkspace()).profile.analysis?.mode).toBe('simple');
    await saveAnalysis('dual');
    unmount();
    const restored = render(<AnalysisPanel {...props} profile={(await loadWorkspace()).profile} />);
    expect((screen.getByLabelText('Chart quantity') as HTMLSelectElement).value).toBe('g1');
    expect((screen.getByLabelText('Second chart quantity') as HTMLSelectElement).value).toBe(
      'velocity',
    );
    expect((await loadWorkspace()).profile.analysis?.simple.quantity).toBe('velocity');
    const missing = { ...props, shots: [shot()] };
    restored.rerender(<AnalysisPanel {...missing} profile={(await loadWorkspace()).profile} />);
    expect((await loadWorkspace()).profile.analysis?.dual.quantity).toBe('g1');
  });
  it('persists display controls without changing source measurements', async () => {
    const close = vi.fn();
    const original = shot();
    await db.shots.put(original);
    render(
      <ProfileDialog profile={defaultProfile()} sources={[]} refreshing={false} onClose={close} />,
    );
    expect(screen.queryByLabelText('Shot detail')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Display' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Projectile weight/ }));
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save display' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect((await loadWorkspace()).profile).toMatchObject({
      theme: 'dark',
      showProjectileWeight: true,
    });
    expect(await db.shots.get(original.id)).toEqual(original);
  });
  it('reorders columns using buttons or drag/drop and restores saved order', async () => {
    vi.stubGlobal('DragEvent', MouseEvent);
    const available = [
      { id: 'series', label: 'Series' },
      { id: 'g1', label: 'G1' },
      { id: 'velocity', label: 'Velocity' },
    ];
    const change = vi.fn(async (ids: string[]) => saveProfile({ tableColumns: ids }));
    const { rerender } = render(
      <ColumnPicker
        available={available}
        selected={['series', 'g1', 'velocity']}
        onChange={change}
      />,
    );
    fireEvent.click(screen.getByText('Columns'));
    fireEvent.click(screen.getByLabelText('Move Velocity up'));
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.tableColumns).toEqual(['series', 'velocity', 'g1']),
    );
    rerender(
      <ColumnPicker
        available={available}
        selected={(await loadWorkspace()).profile.tableColumns!}
        onChange={change}
      />,
    );
    const checkbox = screen.getByRole('checkbox', { name: 'G1' });
    const source = checkbox.closest('.column-option')!;
    const target = screen.getByRole('checkbox', { name: 'Series' }).closest('.column-option')!;
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 400,
      top: 0,
      bottom: 40,
    } as DOMRect);
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer, clientX: 20, clientY: 10 });
    fireEvent.drop(target, { dataTransfer, clientX: 20, clientY: 10 });
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.tableColumns).toEqual(['g1', 'series', 'velocity']),
    );
    fireEvent.click(checkbox);
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.tableColumns).toEqual(['series', 'velocity']),
    );
  });
  it('shows context for a zero-shot string without requiring a plotted measurement', () => {
    render(
      <StringInfo
        series={series({ raw: { notes: 'Imported note', weatherData: { temperature: 32 } } })}
        shots={[]}
        profile={{ ...defaultProfile(), unitSystem: 'metric' }}
        catalog={[]}
        annotations={[]}
        fields={[]}
        tags={[]}
        photos={[]}
      />,
    );
    expect(screen.getByText('Imported note')).toBeTruthy();
    expect(screen.getByText('Temperature (°C)')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });
  it('follows OS theme changes in Auto and honors an explicit theme', () => {
    let matches = false;
    let listener = () => {};
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return matches;
      },
      addEventListener: (_name: string, fn: () => void) => {
        listener = fn;
      },
      removeEventListener: vi.fn(),
    }));
    /** Exercise the real theme hook without mounting the application or changing stored data. */
    function Theme({ mode }: { mode: 'auto' | 'light' | 'dark' }) {
      useTheme(mode);
      return null;
    }
    const { rerender } = render(<Theme mode="auto" />);
    expect(document.documentElement.dataset.theme).toBe('light');
    matches = true;
    // Rerender after the system signal to flush the synchronous external-store update.
    act(() => listener());
    rerender(<Theme mode="auto" />);
    expect(document.documentElement.dataset.theme).toBe('dark');
    rerender(<Theme mode="light" />);
    expect(document.documentElement.dataset.theme).toBe('light');
    vi.unstubAllGlobals();
  });
});
