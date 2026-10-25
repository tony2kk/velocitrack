import { init, use as registerCharts, type EChartsCoreOption } from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { AriaComponent, GridComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { AnalysisMode } from '../domain/model';
import { REPORT_CHART_PIXELS } from '../reports/chartLayout';

registerCharts([
  BarChart,
  LineChart,
  AriaComponent,
  GridComponent,
  DataZoomComponent,
  CanvasRenderer,
]);
export { init };

/** Render a detached, unhovered print canvas and always release its graphics resources. */
export function renderChartImage(
  option: EChartsCoreOption,
  kind: AnalysisMode,
  height: number,
): string {
  const copy = init(document.createElement('div'), undefined, {
    width: REPORT_CHART_PIXELS,
    height,
    renderer: 'canvas',
  });
  const axesForPrint = (axes: unknown) =>
    (Array.isArray(axes) ? axes : axes ? [axes] : []).map((axis: Record<string, unknown>) => ({
      ...axis,
      nameTextStyle: { color: '#334b43', width: 500 },
      axisLabel: { ...(axis.axisLabel as object), color: '#334b43' },
      axisLine: { lineStyle: { color: '#8a9c94' } },
      splitLine: { ...(axis.splitLine as object), lineStyle: { color: '#e6ece8' } },
    }));
  try {
    copy.setOption({
      ...option,
      animation: false,
      backgroundColor: '#ffffff',
      grid: { left: 74, right: kind === 'dual' ? 100 : 64, top: 40, bottom: 48 },
      textStyle: { color: '#334b43' },
      xAxis: axesForPrint(option.xAxis),
      yAxis: axesForPrint(option.yAxis),
    });
    return copy.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      excludeComponents: ['dataZoom'],
    });
  } finally {
    copy.dispose();
  }
}
