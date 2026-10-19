// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MeasurementChart from '../src/components/MeasurementChart';
import { series, shot } from './fixtures/synthetic';
import { defaultAnalysis } from '../src/domain/model';

const chart = vi.hoisted(() => ({
  setOption: vi.fn(),
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
