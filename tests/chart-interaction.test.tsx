// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MeasurementChart from '../src/components/MeasurementChart';
import { series, shot } from './fixtures/synthetic';
import { defaultAnalysis } from '../src/domain/model';
import { centeredSamplesCurve } from '../src/domain/distanceCurves/template';

vi.mock('../src/domain/distanceCurves/customDistanceCurves', async () => ({
  customDistanceCurves: [
    (await import('../src/domain/distanceCurves/calculatedVelocityG1')).calculatedVelocityG1Curve,
    (await import('../src/domain/distanceCurves/calculatedVelocityG7')).calculatedVelocityG7Curve,
    (await import('../src/domain/distanceCurves/calculatedDropG1')).calculatedDropG1Curve,
    (await import('../src/domain/distanceCurves/calculatedDropG7')).calculatedDropG7Curve,
    (await import('../src/domain/distanceCurves/template')).centeredSamplesCurve,
  ],
}));

const chart = vi.hoisted(() => ({
  setOption: vi.fn(),
  getOption: vi.fn(),
  on: vi.fn(),
  dispatchAction: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  init: vi.fn(),
  convertToPixel: vi.fn((_finder, value) => value),
  getWidth: () => 700,
}));
vi.mock('echarts/core', () => ({ init: chart.init, use: vi.fn() }));
vi.mock('echarts/charts', () => ({ LineChart: {} }));
vi.mock('echarts/components', () => ({
  AriaComponent: {},
  GridComponent: {},
  TooltipComponent: {},
  DataZoomComponent: {},
}));
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }));
beforeEach(() => {
  vi.clearAllMocks();
  chart.init.mockReturnValue(chart);
  chart.getOption.mockImplementation(() => chart.setOption.mock.calls.at(-1)?.[0] ?? {});
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Read numerical visible bounds from the explicit axis domain and its slider percentages. */
function visibleRange(axis: { min: number; max: number }, zoom: { start: number; end: number }) {
  return [zoom.start, zoom.end].map(
    (percent) => axis.min + ((axis.max - axis.min) * percent) / 100,
  );
}

/** Simulate the public ECharts gesture state, without depending on private canvas internals. */
function zoomChart(horizontal: [number, number], vertical: [number, number]) {
  const option = chart.setOption.mock.calls.at(-1)![0];
  const dataZoom = option.dataZoom.map((zoom: { id: string }) => ({
    ...zoom,
    start: zoom.id === 'velocity-zoom' ? vertical[0] : horizontal[0],
    end: zoom.id === 'velocity-zoom' ? vertical[1] : horizontal[1],
  }));
  chart.getOption.mockReturnValue({ ...option, dataZoom });
  act(() => chart.on.mock.calls.find(([name]) => name === 'datazoom')![1]());
}

describe('chart viewport', () => {
  it.each([
    ['simple', 'curve:drop-g1', 'metric'],
    ['simple', 'curve:drop-g7', 'imperial'],
    ['compare', 'curve:drop-g1', 'imperial'],
    ['compare', 'curve:drop-g7', 'metric'],
  ] as const)('draws %s %s downward from zero in %s units', (kind, quantity, unitSystem) => {
    render(
      <MeasurementChart
        shots={[
          shot({ muzzleVelocity: 1000, ballisticCoefficientG1: 0.2, ballisticCoefficientG7: 0.1 }),
        ]}
        series={[series()]}
        mode="distance"
        kind={kind}
        settings={{ axis: 'distance', quantity, secondary: 'velocity', forecastDistance: 100 }}
        activeShotId={null}
        onHoverShot={vi.fn()}
        unitSystem={unitSystem}
      />,
    );
    const option = chart.setOption.mock.calls.at(-1)![0];
    expect(option.yAxis).toHaveLength(1);
    expect(option.yAxis[0]).toMatchObject({ min: 0, inverse: true, nameLocation: 'start' });
    expect(option.yAxis[0].name).toContain(unitSystem === 'metric' ? '(cm)' : '(in)');
    expect(option.series[0].data[0].value[1]).toBe(0);
    expect(option.series[0].data.at(-1).value[1]).toBeGreaterThan(0);
    expect(option.yAxis[0].max).toBeGreaterThan(option.series[0].data.at(-1).value[1]);
  });

  it.each([
    ['velocity', 'curve:drop-g1', [false, true]],
    ['curve:drop-g7', 'velocity', [true, false]],
    ['curve:drop-g1', 'curve:drop-g7', [true]],
  ] as const)(
    'inverts only the drop axis when comparing %s with %s',
    (quantity, secondary, inverse) => {
      render(
        <MeasurementChart
          shots={[
            shot({
              muzzleVelocity: 1000,
              ballisticCoefficientG1: 0.2,
              ballisticCoefficientG7: 0.1,
              distances: [0, 100],
              velocities: [1000, 900],
            }),
          ]}
          series={[series()]}
          mode="distance"
          kind="dual"
          settings={{ axis: 'distance', quantity, secondary, forecastDistance: 100 }}
          activeShotId={null}
          onHoverShot={vi.fn()}
        />,
      );
      const option = chart.setOption.mock.calls.at(-1)![0];
      expect(option.yAxis.map((axis: { inverse: boolean }) => axis.inverse)).toEqual(inverse);
      expect(option.series.map((trace: { yAxisIndex: number }) => trace.yAxisIndex)).toEqual(
        inverse.length === 1 ? [0, 0] : [0, 1],
      );
      option.yAxis.forEach((axis: { inverse: boolean; min: number }) => {
        if (axis.inverse) expect(axis.min).toBe(0);
        else expect(axis.min).toBeGreaterThan(0);
      });
    },
  );

  it('retains drop zoom through model and unit changes and restores zero at the top on reset', () => {
    const props = {
      shots: [
        shot({ muzzleVelocity: 1000, ballisticCoefficientG1: 0.2, ballisticCoefficientG7: 0.1 }),
      ],
      series: [series()],
      mode: 'distance' as const,
      settings: {
        axis: 'distance' as const,
        quantity: 'curve:drop-g1',
        secondary: 'velocity',
        forecastDistance: 100,
      },
      activeShotId: null,
      onHoverShot: vi.fn(),
    };
    const { rerender } = render(<MeasurementChart {...props} unitSystem="metric" />);
    zoomChart([10, 80], [20, 60]);
    const old = chart.getOption();
    const previous = visibleRange(old.yAxis[0], old.dataZoom[2]);
    rerender(
      <MeasurementChart
        {...props}
        unitSystem="imperial"
        settings={{ ...props.settings, quantity: 'curve:drop-g7' }}
      />,
    );
    let next = chart.setOption.mock.calls.at(-1)![0];
    expect(next.yAxis[0].inverse).toBe(true);
    visibleRange(next.yAxis[0], next.dataZoom[2]).forEach((value, index) =>
      expect(value).toBeCloseTo(previous[index]! / 2.54),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset chart scales' }));
    next = chart.setOption.mock.calls.at(-1)![0];
    expect(next.yAxis[0]).toMatchObject({ min: 0, inverse: true });
    expect(next.dataZoom[2]).toMatchObject({ start: 0, end: 100 });
    expect(visibleRange(next.yAxis[0], next.dataZoom[2])[0]).toBe(0);
  });

  it('renders a registered distance quantity on its own axis while retaining continuous zoom on both axes', () => {
    render(
      <MeasurementChart
        shots={[shot({ distances: [0, 10], velocities: [100, 95] })]}
        series={[series()]}
        mode="distance"
        kind="dual"
        settings={{ axis: 'distance', quantity: 'velocity', secondary: centeredSamplesCurve.id }}
        activeShotId={null}
        onHoverShot={vi.fn()}
        unitSystem="metric"
      />,
    );
    const option = chart.setOption.mock.calls.at(-1)![0];
    expect(option.yAxis.map((axis: { name: string }) => axis.name)).toEqual([
      'Velocity (m/s)',
      centeredSamplesCurve.label('metric'),
    ]);
    expect(option.series.map((trace: { yAxisIndex: number }) => trace.yAxisIndex)).toEqual([0, 1]);
    expect(option.yAxis[1].min).toBeLessThan(-1.524);
    expect(option.yAxis[1].max).toBeGreaterThan(0);
    expect(option.dataZoom[1].realtime).toBe(true);
    expect(option.dataZoom[2]).toMatchObject({ yAxisIndex: [0, 1], realtime: true });
  });

  it('finishes fitting newly supplied data after reset updates a linked right edge', () => {
    const changed = vi.fn();
    const props = {
      shots: [shot({ distances: [0, 100], velocities: [1000, 900] })],
      series: [series()],
      mode: 'distance' as const,
      activeShotId: null,
      onHoverShot: vi.fn(),
      forecastDistance: 60,
      onForecastDistanceChange: changed,
    };
    const { rerender } = render(<MeasurementChart {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset chart scales' }));
    expect(changed).toHaveBeenLastCalledWith(100);
    rerender(
      <MeasurementChart
        {...props}
        forecastDistance={100}
        shots={[shot({ distances: [0, 100], velocities: [1000, 800] })]}
      />,
    );
    const next = chart.setOption.mock.calls.at(-1)![0];
    expect(visibleRange(next.yAxis[0], next.dataZoom[2])[0]).toBeLessThan(800);
    expect(next.dataZoom[2]).toMatchObject({ start: 0, end: 100 });
  });

  it('keeps numerical bounds through data, theme and same-dimension quantity changes', () => {
    const props = {
      shots: [
        shot({
          distances: [0, 100],
          velocities: [1000, 900],
          muzzleVelocity: 1000,
          ballisticCoefficientG1: 0.2,
        }),
      ],
      series: [series()],
      mode: 'distance' as const,
      kind: 'dual' as const,
      settings: { ...defaultAnalysis().dual, axis: 'distance' as const, secondary: 'velocity' },
      activeShotId: null,
      onHoverShot: vi.fn(),
    };
    const { rerender } = render(<MeasurementChart {...props} />);
    zoomChart([10, 70], [20, 80]);
    const old = chart.getOption();
    const expected = visibleRange(old.yAxis[0], old.dataZoom[2]);
    rerender(
      <MeasurementChart
        {...props}
        dark
        settings={{ ...props.settings, secondary: 'calculated:g1' }}
      />,
    );
    const next = chart.setOption.mock.calls.at(-1)![0];
    expect(visibleRange(next.xAxis, next.dataZoom[1])[0]).toBeCloseTo(10);
    expect(visibleRange(next.xAxis, next.dataZoom[1])[1]).toBeCloseTo(70);
    visibleRange(next.yAxis[0], next.dataZoom[2]).forEach((value, i) =>
      expect(value).toBeCloseTo(expected[i]!),
    );
    expect(chart.init).toHaveBeenCalledTimes(1);
    expect(chart.dispose).not.toHaveBeenCalled();
  });

  it('converts a retained viewport when display units change and resets to current data on demand', () => {
    const props = {
      shots: [shot({ distances: [0, 100], velocities: [1000, 900] })],
      series: [series()],
      mode: 'distance' as const,
      activeShotId: null,
      onHoverShot: vi.fn(),
    };
    const { rerender } = render(<MeasurementChart {...props} />);
    zoomChart([20, 60], [25, 75]);
    const old = chart.getOption();
    const y = visibleRange(old.yAxis[0], old.dataZoom[2]);
    rerender(<MeasurementChart {...props} unitSystem="metric" />);
    let next = chart.setOption.mock.calls.at(-1)![0];
    expect(visibleRange(next.xAxis, next.dataZoom[1])).toEqual([6.096, 18.288]);
    visibleRange(next.yAxis[0], next.dataZoom[2]).forEach((value, i) =>
      expect(value).toBeCloseTo(y[i]! * 0.3048),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset chart scales' }));
    next = chart.setOption.mock.calls.at(-1)![0];
    expect(visibleRange(next.xAxis, next.dataZoom[1])[1]).toBeCloseTo(30.48);
    expect(next.dataZoom[2]).toMatchObject({ start: 0, end: 100 });
    expect(chart.init).toHaveBeenCalledTimes(1);
  });

  it('synchronizes the right edge in both directions without losing the left or vertical window', () => {
    vi.useFakeTimers();
    const changed = vi.fn();
    const props = {
      shots: [shot({ distances: [0, 100], velocities: [1000, 900] })],
      series: [series()],
      mode: 'distance' as const,
      activeShotId: null,
      onHoverShot: vi.fn(),
      forecastDistance: 100,
      onForecastDistanceChange: changed,
    };
    const { rerender, unmount } = render(<MeasurementChart {...props} />);
    zoomChart([20, 60], [25, 75]);
    act(() => vi.advanceTimersByTime(180));
    expect(changed).toHaveBeenLastCalledWith(60);
    rerender(<MeasurementChart {...props} forecastDistance={60} />);
    const before = chart.setOption.mock.calls.at(-1)![0];
    const vertical = visibleRange(before.yAxis[0], before.dataZoom[2]);
    rerender(<MeasurementChart {...props} forecastDistance={200} />);
    const after = chart.setOption.mock.calls.at(-1)![0];
    expect(visibleRange(after.xAxis, after.dataZoom[1])).toEqual([20, 200]);
    expect(visibleRange(after.yAxis[0], after.dataZoom[2])).toEqual(vertical);
    const count = changed.mock.calls.length;
    zoomChart([10, 100], [30, 70]);
    act(() => vi.advanceTimersByTime(180));
    expect(changed).toHaveBeenCalledTimes(count);
    zoomChart([10, 50], [30, 70]);
    unmount();
    act(() => vi.runAllTimers());
    expect(changed).toHaveBeenCalledTimes(count);
  });

  it('retains axis-specific ranges across unmounts and does not freeze an empty chart at 0–1', () => {
    const memory = new Map();
    const props = {
      shots: [] as ReturnType<typeof shot>[],
      series: [series()],
      mode: 'distance' as const,
      activeShotId: null,
      onHoverShot: vi.fn(),
      viewportMemory: memory,
    };
    const view = render(<MeasurementChart {...props} />);
    view.rerender(
      <MeasurementChart
        {...props}
        shots={[shot({ distances: [0, 100], velocities: [1000, 900] })]}
      />,
    );
    expect(chart.setOption.mock.calls.at(-1)![0].xAxis.max).toBe(100);
    zoomChart([10, 50], [20, 80]);
    view.unmount();
    render(
      <MeasurementChart
        {...props}
        shots={[shot({ distances: [0, 200], velocities: [1100, 800] })]}
      />,
    );
    const option = chart.setOption.mock.calls.at(-1)![0];
    expect(visibleRange(option.xAxis, option.dataZoom[1])).toEqual([10, 50]);
  });
});

describe('chart hover bridge', () => {
  it('links a comparison mean to its contributing rows and a row to matching mean points', () => {
    const onHoverShots = vi.fn();
    const props = {
      shots: [
        shot({ id: 'a', distances: [0, 10], velocities: [100, 80] }),
        shot({ id: 'b', distances: [5, 15], velocities: [110, 90] }),
      ],
      series: [series()],
      mode: 'distance' as const,
      kind: 'compare' as const,
      settings: { ...defaultAnalysis().compare, axis: 'distance' as const },
      activeShotId: null as string | null,
      onHoverShot: vi.fn(),
      onHoverShots,
    };
    const { rerender } = render(<MeasurementChart {...props} />);
    act(() =>
      chart.on.mock.calls.find(([name]) => name === 'mouseover')![1]({
        seriesIndex: 0,
        dataIndex: 1,
      }),
    );
    expect(onHoverShots).toHaveBeenLastCalledWith(['a', 'b']);
    rerender(<MeasurementChart {...props} activeShotId="b" activeShotIds={['b']} />);
    expect(chart.init).toHaveBeenCalledTimes(1);
    expect(
      chart.dispatchAction.mock.calls
        .filter(([action]) => action.type === 'highlight')
        .map(([action]) => action.dataIndex),
    ).toEqual([1, 2, 3]);
    act(() => chart.on.mock.calls.find(([name]) => name === 'globalout')![1]());
    expect(onHoverShots).toHaveBeenLastCalledWith([]);
  });
  it('binds dual quantities to separate axes and zooms both without removing missing positions', () => {
    render(
      <MeasurementChart
        shots={[shot({ ballisticCoefficientG1: 0.2 }), shot({ id: 'missing', number: 2 })]}
        series={[series()]}
        mode="shot"
        kind="dual"
        settings={defaultAnalysis().dual}
        activeShotId={null}
        onHoverShot={vi.fn()}
      />,
    );
    const options = chart.setOption.mock.calls[0]![0];
    expect(options.yAxis.map((axis: { name: string }) => axis.name)).toEqual([
      'Velocity (ft/s)',
      'G1 (Caldwell)',
    ]);
    expect(options.series.map((trace: { yAxisIndex: number }) => trace.yAxisIndex)).toEqual([0, 1]);
    expect(options.series[1].data[1].value).toEqual([2, null]);
    expect(
      options.dataZoom.find((zoom: { orient: string }) => zoom.orient === 'vertical').yAxisIndex,
    ).toEqual([0, 1]);
  });
  it('zooms each axis independently without filtering samples, and clears obsolete point details', () => {
    render(
      <MeasurementChart
        shots={[shot({ distances: [0, 100], velocities: [1000, 900] })]}
        series={[series()]}
        mode="distance"
        activeShotId={null}
        onHoverShot={vi.fn()}
        unitSystem="metric"
      />,
    );
    const options = chart.setOption.mock.calls[0]![0];
    expect(options.xAxis.name).toBe('Distance (m)');
    expect(options.yAxis[0].name).toBe('Velocity (m/s)');
    expect(options.dataZoom).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'slider', xAxisIndex: 0, filterMode: 'none' }),
        expect.objectContaining({
          type: 'slider',
          orient: 'vertical',
          yAxisIndex: [0],
          filterMode: 'none',
        }),
      ]),
    );
    act(() =>
      chart.on.mock.calls.find(([name]) => name === 'mouseover')![1]({
        seriesIndex: 0,
        dataIndex: 1,
      }),
    );
    expect(screen.getByRole('tooltip').textContent).toContain('Distance: 30.48 m');
    act(() => chart.on.mock.calls.find(([name]) => name === 'datazoom')![1]());
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(chart.init).toHaveBeenCalledTimes(1);
  });
  it('emphasizes a linked trace without recreating the chart, then clears it', () => {
    const props = {
      shots: [shot({ distances: [0], velocities: [300] })],
      series: [series()],
      mode: 'distance' as const,
      activeShotId: null as string | null,
      onHoverShot: vi.fn(),
    };
    const { rerender, unmount } = render(<MeasurementChart {...props} />);
    rerender(<MeasurementChart {...props} activeShotId="shot" />);
    expect(chart.init).toHaveBeenCalledTimes(1);
    expect(chart.setOption).toHaveBeenCalledTimes(1);
    expect(chart.dispatchAction).toHaveBeenLastCalledWith({
      type: 'highlight',
      seriesIndex: 0,
      dataIndex: undefined,
    });
    rerender(<MeasurementChart {...props} />);
    expect(chart.dispatchAction).toHaveBeenLastCalledWith({ type: 'downplay' });
    unmount();
    expect(chart.dispose).toHaveBeenCalledOnce();
  });

  it.each(['distance', 'shot'] as const)(
    'reports the actual shot identity from %s chart events',
    (mode) => {
      const onHoverShot = vi.fn();
      render(
        <MeasurementChart
          shots={[
            shot({ id: 'one', distances: [0], velocities: [300] }),
            shot({ id: 'two', seriesId: 'other', distances: [0], velocities: [310] }),
          ]}
          series={[series(), series({ id: 'other' })]}
          mode={mode}
          activeShotId={null}
          onHoverShot={onHoverShot}
        />,
      );
      const enter = chart.on.mock.calls.find(([name]) => name === 'mouseover')![1];
      act(() => enter({ seriesIndex: 1, dataIndex: 0 }));
      expect(onHoverShot).toHaveBeenLastCalledWith('two');
      expect(screen.getByRole('tooltip').textContent).toContain(
        mode === 'distance' ? 'Velocity: 310 ft/s' : 'Velocity: 10 ft/s',
      );
      act(() => chart.on.mock.calls.find(([name]) => name === 'globalout')![1]());
      expect(onHoverShot).toHaveBeenLastCalledWith(null);
      expect(screen.queryByRole('tooltip')).toBeNull();
    },
  );

  it('finds a measured sample beneath a line hit area and renders imported names only as text', () => {
    render(
      <MeasurementChart
        shots={[shot({ distances: [0, 10], velocities: [300, 290] })]}
        series={[series({ name: '<img src=x onerror=alert(1)>' })]}
        mode="distance"
        activeShotId={null}
        onHoverShot={vi.fn()}
      />,
    );
    const move = chart.on.mock.calls.find(([name]) => name === 'mousemove')![1];
    act(() => move({ seriesIndex: 0, event: { offsetX: 10, offsetY: 290 } }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.textContent).toContain('Sample 2');
    expect(tooltip.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(tooltip.querySelector('img')).toBeNull();
    act(() => move({ seriesIndex: 0, event: { offsetX: 50, offsetY: 250 } }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
