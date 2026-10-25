// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AnalysisPanel } from '../src/components/AnalysisPanel';
import { defaultProfile } from '../src/domain/model';
import { series, shot } from './fixtures/synthetic';

vi.mock('../src/domain/distanceCurves/customDistanceCurves', async () => ({
  customDistanceCurves: [(await import('./fixtures/contextCurve')).contextCurve],
}));
const chart = vi.hoisted(() => ({
  setOption: vi.fn(),
  on: vi.fn(),
  dispatchAction: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock('echarts/core', () => ({ init: () => chart, use: vi.fn() }));
vi.mock('echarts/charts', () => ({ LineChart: {}, BarChart: {} }));
vi.mock('echarts/components', () => ({
  AriaComponent: {},
  GridComponent: {},
  DataZoomComponent: {},
}));
vi.mock('echarts/renderers', () => ({ CanvasRenderer: {} }));
beforeEach(() => {
  vi.clearAllMocks();
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

it('uses the same current context in both menus, omission notices and actual chart dispatch', async () => {
  const profile = defaultProfile();
  profile.analysis!.mode = 'dual';
  profile.analysis!.dual = {
    axis: 'distance',
    quantity: 'velocity',
    secondary: 'curve:string-review-score',
  };
  const props = {
    series: [series({ raw: { sampleGroup: 'enabled' } })],
    shots: [shot({ raw: { reviewed: true }, distances: [0, 10], velocities: [100, 95] })],
    fields: [{ id: 'score', name: 'Review score', type: 'number' as const, order: 0 }],
    annotations: [{ entityId: 'series', notes: '', fields: {}, values: { score: 7 } }],
    view: 'chart' as const,
    activeShotId: null,
    onHoverShot: vi.fn(),
    profile,
  };
  const view = render(<AnalysisPanel {...props} />);
  expect(screen.getByLabelText('Chart quantity').textContent).toContain('String review score');
  expect(screen.getByLabelText('Second chart quantity').textContent).toContain(
    'String review score',
  );
  await waitFor(() => expect(chart.setOption).toHaveBeenCalled());
  expect(chart.setOption.mock.calls.at(-1)![0].series[1].data[0].value[1]).toBe(7);
  expect(screen.queryByText(/shot\(s\) omitted from String review score/)).toBeNull();
  view.rerender(
    <AnalysisPanel
      {...props}
      annotations={[{ entityId: 'series', notes: '', fields: {}, values: { score: 11 } }]}
    />,
  );
  await waitFor(() =>
    expect(chart.setOption.mock.calls.at(-1)![0].series[1].data[0].value[1]).toBe(11),
  );
  view.rerender(<AnalysisPanel {...props} annotations={[]} />);
  expect(screen.getByText(/1 shot\(s\) omitted from String review score/)).toBeTruthy();
  await waitFor(() => expect(chart.setOption.mock.calls.at(-1)![0].series).toHaveLength(1));
});
