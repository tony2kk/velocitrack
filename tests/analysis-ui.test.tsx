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
import { defaultProfile, type Profile } from '../src/domain/model';
import { columnOrder, visibleColumns } from '../src/domain/table';
import { db } from '../src/storage/database';
import { saveAnalysis } from '../src/storage/analysis';
import { loadWorkspace, saveProfile } from '../src/storage/workspace';
import { series, shot } from './fixtures/synthetic';
import { centeredSamplesCurve } from '../src/domain/distanceCurves/template';

vi.mock('../src/components/MeasurementChart', () => ({ default: () => <div>Chart canvas</div> }));
vi.mock('../src/domain/distanceCurves/customDistanceCurves', async () => ({
  customDistanceCurves: [
    (await import('../src/domain/distanceCurves/calculatedVelocityG1')).calculatedVelocityG1Curve,
    (await import('../src/domain/distanceCurves/calculatedVelocityG7')).calculatedVelocityG7Curve,
    (await import('../src/domain/distanceCurves/calculatedDropG1')).calculatedDropG1Curve,
    (await import('../src/domain/distanceCurves/calculatedDropG7')).calculatedDropG7Curve,
    (await import('../src/domain/distanceCurves/template')).centeredSamplesCurve,
  ],
}));
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
  it('separates string and shot quantities in comparison and persists the new axis', async () => {
    const profile = defaultProfile();
    profile.analysis!.mode = 'compare';
    await saveProfile(profile);
    const props = {
      series: [series({ airDensity: 1.2 })],
      shots: [shot()],
      view: 'chart' as const,
      activeShotId: null,
      onHoverShot: vi.fn(),
      profile,
    };
    const { rerender } = render(<AnalysisPanel {...props} />);
    expect(screen.queryByRole('option', { name: /Air density/ })).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: 'Chart type' }), {
      target: { value: 'string' },
    });
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.analysis?.compare.axis).toBe('string'),
    );
    const saved = (await loadWorkspace()).profile;
    rerender(<AnalysisPanel {...props} shots={[]} profile={saved} />);
    expect(screen.getByRole('option', { name: /Air density/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /^Velocity / })).toBeNull();
    expect(screen.queryByText(/No shots selected/)).toBeNull();
  });
  it('shows every selected string and complete original data in String info, including zero-shot strings', () => {
    const profile = defaultProfile();
    profile.analysis!.mode = 'info';
    profile.infoSeriesId = 'one'; // Older profiles must not hide the other selected strings.
    const parents = [
      series({ id: 'one', name: 'First context', raw: { unknownReading: 1.234567 } }),
      series({
        id: 'two',
        name: 'Second context',
        raw: { nested: { note: 'Complete second data' } },
      }),
    ];
    render(
      <AnalysisPanel
        shots={[]}
        series={parents}
        profile={profile}
        view="chart"
        activeShotId={null}
        onHoverShot={vi.fn()}
      />,
    );
    expect(screen.getByRole('region', { name: 'String info: First context' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'String info: Second context' })).toBeTruthy();
    expect(screen.getByText(/"unknownReading": 1.234567/)).toBeTruthy();
    expect(screen.getByText(/Complete second data/)).toBeTruthy();
    expect(screen.getAllByText('Complete string data (JSON)')).toHaveLength(2);
  });
  it('restores legacy local choices as automatic models and explains mixed conditions', async () => {
    const profile = defaultProfile();
    profile.analysis!.mode = 'dual';
    profile.analysis!.dual = {
      axis: 'distance',
      quantity: 'velocity',
      secondary: 'curve:velocity-g1-local',
    };
    await saveProfile(profile);
    const props = {
      shots: [
        shot({
          muzzleVelocity: 1000,
          ballisticCoefficientG1: 0.3,
          ballisticCoefficientG7: 0.2,
          distances: [10],
          velocities: [990],
        }),
        shot({
          id: 'second',
          seriesId: 'missing',
          muzzleVelocity: 1000,
          ballisticCoefficientG1: 0.3,
        }),
      ],
      view: 'chart' as const,
      activeShotId: null,
      onHoverShot: vi.fn(),
    };
    const parents = [
      series({
        name: 'Local string',
        airDensity: 1.1,
        soundSpeed: 345,
        raw: { altitude: 0, weatherData: { temperature: 68, pressure: 1010, humidity: 50 } },
      }),
      series({ id: 'missing', name: 'Missing weather' }),
    ];
    const view = render(<AnalysisPanel {...props} series={parents} profile={profile} />);
    for (const name of ['Chart quantity', 'Second chart quantity']) {
      expect(screen.getByLabelText(name).textContent).toContain('Calculated velocity (G1)');
      expect(screen.getByLabelText(name).textContent).not.toContain(', local)');
    }
    expect((screen.getByLabelText('Second chart quantity') as HTMLSelectElement).value).toBe(
      'calculated:g1',
    );
    expect(
      screen.getByText(/Local string — Atmosphere: 20.0 °C, 1010.00 hPa, humid air/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Missing weather — Atmosphere: 15.0 °C, 1013.25 hPa, dry air/),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Second chart quantity'), {
      target: { value: 'calculated:g7' },
    });
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.analysis!.dual.secondary).toBe('calculated:g7'),
    );
    const saved = (await loadWorkspace()).profile;
    view.rerender(
      <AnalysisPanel {...props} series={[series(), series({ id: 'missing' })]} profile={saved} />,
    );
    expect(screen.getByText(/Atmosphere: 15.0 °C, 1013.25 hPa, dry air/)).toBeTruthy();
    expect(screen.queryByText(/string air density or sound speed/)).toBeNull();
  });
  it('collapses an old standard/local pair without calling the shared quantity unavailable', () => {
    const profile = defaultProfile();
    profile.analysis!.mode = 'dual';
    profile.analysis!.dual = {
      axis: 'distance',
      quantity: 'calculated:g1',
      secondary: 'curve:velocity-g1-local',
    };
    render(
      <AnalysisPanel
        series={[series()]}
        shots={[
          shot({ muzzleVelocity: 1000, ballisticCoefficientG1: 0.3, ballisticCoefficientG7: 0.2 }),
        ]}
        view="chart"
        activeShotId={null}
        onHoverShot={vi.fn()}
        profile={profile}
      />,
    );
    expect(screen.getByText('Same as primary quantity')).toBeTruthy();
    expect(screen.queryByText('Saved quantity — no readings')).toBeNull();
    expect(screen.getAllByText(/Atmosphere: 15.0 °C/)).toHaveLength(1);
  });
  it('keeps both drop choices when controls change before the profile has rerendered', async () => {
    const profile = defaultProfile();
    profile.analysis!.mode = 'dual';
    profile.analysis!.dual = { axis: 'distance', quantity: 'velocity', secondary: 'calculated:g1' };
    await saveProfile(profile);
    render(
      <AnalysisPanel
        series={[series()]}
        shots={[
          shot({ muzzleVelocity: 1000, ballisticCoefficientG1: 0.3, ballisticCoefficientG7: 0.2 }),
        ]}
        view="chart"
        activeShotId={null}
        onHoverShot={vi.fn()}
        profile={profile}
      />,
    );
    fireEvent.change(screen.getByLabelText('Chart quantity'), {
      target: { value: 'curve:drop-g1' },
    });
    fireEvent.change(screen.getByLabelText('Second chart quantity'), {
      target: { value: 'curve:drop-g7' },
    });
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.analysis!.dual).toMatchObject({
        quantity: 'curve:drop-g1',
        secondary: 'curve:drop-g7',
      }),
    );
  });
  it('discovers registered curves in both menus, renders their descriptions and restores the saved ID', async () => {
    const profile = defaultProfile();
    profile.analysis!.mode = 'dual';
    profile.analysis!.dual = { axis: 'distance', quantity: 'velocity', secondary: 'velocity' };
    await saveProfile({ analysis: profile.analysis });
    const props = {
      series: [series()],
      shots: [shot({ distances: [0, 10], velocities: [100, 95] })],
      view: 'chart' as const,
      activeShotId: null,
      onHoverShot: vi.fn(),
    };
    const view = render(<AnalysisPanel {...props} profile={profile} />);
    const label = centeredSamplesCurve.label('imperial');
    expect(screen.getByLabelText('Chart quantity').textContent).toContain(label);
    expect(screen.getByLabelText('Second chart quantity').textContent).toContain(label);
    fireEvent.change(screen.getByLabelText('Second chart quantity'), {
      target: { value: centeredSamplesCurve.id },
    });
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.analysis?.dual.secondary).toBe(
        centeredSamplesCurve.id,
      ),
    );
    view.unmount();
    render(<AnalysisPanel {...props} profile={(await loadWorkspace()).profile} />);
    expect((screen.getByLabelText('Second chart quantity') as HTMLSelectElement).value).toBe(
      centeredSamplesCurve.id,
    );
    expect(
      screen.getByText(
        new RegExp(centeredSamplesCurve.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Recorded distance\/velocity samples/)).toBeTruthy();
    expect(screen.queryByText(/Standard atmosphere: 15/)).toBeNull();
    fireEvent.change(screen.getByLabelText('Chart type'), { target: { value: 'shot' } });
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.analysis?.dual.secondary).not.toBe(
        centeredSamplesCurve.id,
      ),
    );
  });

  it('does not round the saved viewport when an untouched formatted distance field loses focus', async () => {
    const analysis = {
      ...defaultProfile().analysis!,
      mode: 'dual' as const,
      dual: {
        axis: 'distance' as const,
        quantity: 'velocity',
        secondary: 'calculated:g1',
        forecastDistance: 100.123456,
      },
    };
    await saveProfile({ analysis });
    render(
      <AnalysisPanel
        series={[series()]}
        shots={[shot({ muzzleVelocity: 1000, ballisticCoefficientG1: 0.2 })]}
        view="chart"
        activeShotId={null}
        onHoverShot={vi.fn()}
        unitSystem="metric"
        profile={(await loadWorkspace()).profile}
      />,
    );
    const input = screen.getByLabelText('Forecast distance') as HTMLInputElement;
    expect(input.value).toBe('30.518');
    fireEvent.blur(input);
    expect((await loadWorkspace()).profile.analysis?.dual.forecastDistance).toBe(100.123456);
  });

  it('persists calculated distance choices and the display-unit forecast horizon independently', async () => {
    const profile = {
      ...defaultProfile(),
      analysis: { ...defaultProfile().analysis!, mode: 'dual' as const },
    };
    const props = {
      series: [series()],
      shots: [
        shot({
          muzzleVelocity: 1000,
          ballisticCoefficientG1: 0.3,
          distances: [0, 10],
          velocities: [1000, 995],
        }),
      ],
      view: 'chart' as const,
      activeShotId: null,
      onHoverShot: vi.fn(),
      unitSystem: 'metric' as const,
    };
    const { rerender } = render(<AnalysisPanel {...props} profile={profile} />);
    fireEvent.change(screen.getByLabelText('Chart type'), { target: { value: 'distance' } });
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.analysis?.dual.axis).toBe('distance'),
    );
    // Set the active mode as the toolbar would, without altering the saved dual controls.
    await saveAnalysis('dual');
    rerender(<AnalysisPanel {...props} profile={(await loadWorkspace()).profile} />);
    fireEvent.change(screen.getByLabelText('Second chart quantity'), {
      target: { value: 'calculated:g1' },
    });
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.analysis?.dual.secondary).toBe('calculated:g1'),
    );
    rerender(<AnalysisPanel {...props} profile={(await loadWorkspace()).profile} />);
    fireEvent.change(screen.getByLabelText('Forecast distance'), { target: { value: '100' } });
    fireEvent.blur(screen.getByLabelText('Forecast distance'));
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.analysis?.dual.forecastDistance).toBeCloseTo(
        100 / 0.3048,
      ),
    );
    rerender(<AnalysisPanel {...props} profile={(await loadWorkspace()).profile} />);
    expect((screen.getByLabelText('Forecast distance') as HTMLInputElement).value).toBe('100');
  });
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
        order={['series', 'shot', 'g1']}
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
    expect(change).toHaveBeenCalledWith({
      tableColumns: ['g1', 'series', 'shot'],
      tableColumnOrder: ['g1', 'series', 'shot'],
    });
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
    expect(screen.getByRole('columnheader', { name: 'Pressure (hPa)' })).toBeTruthy();
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
      shots: [
        shot({
          ballisticCoefficientG1: 0.2,
          muzzleVelocity: 1000,
          distances: [0, 10],
          velocities: [1000, 990],
        }),
      ],
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
    fireEvent.click(screen.getByRole('checkbox', { name: /Show group size on string cards/ }));
    const notes = screen.getByRole('checkbox', { name: /Show Caldwell string notes/ });
    expect((notes as HTMLInputElement).checked).toBe(true);
    fireEvent.click(notes);
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save display' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect((await loadWorkspace()).profile).toMatchObject({
      theme: 'dark',
      showProjectileWeight: true,
      showGroupSize: true,
      showCaldwellNotes: false,
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
    const change = vi.fn(async (patch: Partial<Profile>) => saveProfile(patch));
    const { rerender } = render(
      <ColumnPicker
        available={available}
        selected={['series', 'g1', 'velocity']}
        order={['series', 'g1', 'velocity']}
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
        order={(await loadWorkspace()).profile.tableColumnOrder!}
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
  it('keeps hidden columns in place through re-enabling, manual moves and reopening', async () => {
    const available = [
      { id: 'series', label: 'String' },
      { id: 'g1', label: 'G1' },
      { id: 'field:custom', label: 'Custom field' },
      { id: 'velocity', label: 'Velocity' },
    ];
    const original = ['series', 'g1', 'field:custom', 'velocity'];
    await saveProfile({ tableColumns: original }); // Existing profiles have no complete order yet.
    /** Render persisted preferences as the real workspace does after each IndexedDB update. */
    function picker(profile: Profile) {
      return (
        <ColumnPicker
          available={available}
          order={columnOrder(available, profile)}
          selected={visibleColumns(profile)}
          onChange={(patch) => void saveProfile(patch)}
        />
      );
    }
    const view = render(picker((await loadWorkspace()).profile));
    fireEvent.click(screen.getByText('Columns'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'G1' }));
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.tableColumns).toEqual([
        'series',
        'field:custom',
        'velocity',
      ]),
    );
    view.rerender(picker((await loadWorkspace()).profile));
    expect(screen.getAllByRole('checkbox').map((item) => item.parentElement!.textContent)).toEqual([
      'String',
      'G1',
      'Custom field',
      'Velocity',
    ]);
    fireEvent.click(screen.getByRole('checkbox', { name: 'G1' }));
    await waitFor(async () =>
      expect(visibleColumns((await loadWorkspace()).profile)).toEqual(original),
    );
    view.rerender(picker((await loadWorkspace()).profile));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Custom field' }));
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.tableColumns).toEqual(['series', 'g1', 'velocity']),
    );
    view.rerender(picker((await loadWorkspace()).profile));
    fireEvent.click(screen.getByRole('button', { name: 'Move Custom field up' }));
    await waitFor(async () =>
      expect((await loadWorkspace()).profile.tableColumnOrder).toEqual([
        'series',
        'field:custom',
        'g1',
        'velocity',
      ]),
    );
    expect(visibleColumns((await loadWorkspace()).profile)).toEqual(['series', 'g1', 'velocity']);
    view.unmount();
    render(picker((await loadWorkspace()).profile));
    fireEvent.click(screen.getByText('Columns'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Custom field' }));
    await waitFor(async () =>
      expect(visibleColumns((await loadWorkspace()).profile)).toEqual([
        'series',
        'field:custom',
        'g1',
        'velocity',
      ]),
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
    expect(screen.getByText('0.0')).toBeTruthy();
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
