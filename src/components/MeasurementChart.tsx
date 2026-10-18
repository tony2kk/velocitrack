import { useEffect, useRef } from 'react';
import { init, use as registerCharts } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { inspectPoints } from '../domain/measurements';
import type { Series, Shot } from '../domain/model';

// Register only the renderers/components this app uses to keep the lazy chart bundle bounded.
registerCharts([
  LineChart,
  AriaComponent,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  CanvasRenderer,
]);
const colors = ['#0c8176', '#5978c7', '#d38a36', '#ac6399', '#758b3c', '#607b91'];

/** Render recorded values without interpolation models or unit conversion; the table is the fallback. */
export default function MeasurementChart({
  shots,
  series,
  mode,
}: {
  shots: Shot[];
  series: Series[];
  mode: 'distance' | 'shot';
}) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current) return;
    const chart = init(element.current);
    const names = new Map(series.map((item) => [item.id, item.name]));
    const included = shots.filter((shot) => !shot.excluded);
    // Bound distance traces for responsiveness; the parent explains the limit and retains all rows.
    const lines =
      mode === 'distance'
        ? included.slice(0, 100).map((shot) => ({
            name: `${names.get(shot.seriesId)} · shot ${shot.number}`,
            type: 'line' as const,
            data: inspectPoints(shot).points.map((point) => [point.distance, point.velocity]),
            showSymbol: true,
            symbolSize: 4,
            connectNulls: false,
            lineStyle: { width: 1.6, opacity: 0.65 },
            itemStyle: {
              color: colors[series.findIndex((item) => item.id === shot.seriesId) % colors.length],
            },
          }))
        : series.map((item, index) => ({
            name: item.name,
            type: 'line' as const,
            data: included
              .filter(
                (shot) =>
                  shot.seriesId === item.id &&
                  shot.muzzleVelocity !== null &&
                  shot.muzzleVelocity > 0,
              )
              .sort((a, b) => a.number - b.number)
              .map((shot) => [shot.number, shot.muzzleVelocity]),
            showSymbol: true,
            symbolSize: 7,
            itemStyle: { color: colors[index % colors.length] },
          }));
    chart.setOption({
      animation: false,
      aria: {
        enabled: true,
        label: {
          description:
            'Recorded measurements. Physical units are unverified. An accessible shot table is available using the Table button.',
        },
      },
      textStyle: { fontFamily: 'system-ui, sans-serif', color: '#63716e' },
      grid: { left: 64, right: 30, top: 32, bottom: 75 },
      // Canvas text prevents imported session names from becoming tooltip HTML.
      tooltip: { trigger: 'item', renderMode: 'richText', confine: true },
      xAxis: {
        type: 'value',
        name: mode === 'distance' ? 'Distance · raw value' : 'Shot number',
        nameLocation: 'middle',
        nameGap: 32,
        minInterval: mode === 'shot' ? 1 : undefined,
        axisLine: { lineStyle: { color: '#dae3df' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'Velocity · raw value',
        scale: true,
        splitLine: { lineStyle: { color: '#edf1ef' } },
      },
      dataZoom: [
        { type: 'inside', filterMode: 'none' },
        {
          type: 'slider',
          height: 14,
          bottom: 6,
          borderColor: 'transparent',
          fillerColor: '#0c817622',
        },
      ],
      series: lines,
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element.current);
    return () => {
      // Effects rerun for a new selection; dispose both resources to avoid orphaned canvases/listeners.
      observer.disconnect();
      chart.dispose();
    };
  }, [shots, series, mode]);
  return (
    <div
      className="measurement-chart"
      ref={element}
      role="img"
      aria-label="Recorded velocity chart. Use Table for individual values."
    />
  );
}
