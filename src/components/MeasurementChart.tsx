import { useEffect, useMemo, useRef, useState } from 'react';
import { init, use as registerCharts, type EChartsType } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { AriaComponent, GridComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { Series, Shot } from '../domain/model';
import {
  buildChartTraces,
  findShotTargets,
  formatPointTooltip,
  type ChartMode,
  type ChartPoint,
  type ChartTrace,
} from '../domain/chart';

registerCharts([LineChart, AriaComponent, GridComponent, DataZoomComponent, CanvasRenderer]);

/** Render measured points and bridge ECharts hover events to the shared shot identity. */
export default function MeasurementChart({
  shots,
  series,
  mode,
  activeShotId,
  onHoverShot,
}: {
  shots: Shot[];
  series: Series[];
  mode: ChartMode;
  activeShotId: string | null;
  onHoverShot: (id: string | null) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<EChartsType | null>(null);
  const [details, setDetails] = useState<{
    traces: ChartTrace[];
    point: ChartPoint;
    left: number;
    top: number;
  } | null>(null);
  const traces = useMemo(() => buildChartTraces(shots, series, mode), [shots, series, mode]);
  useEffect(() => {
    if (!element.current) return;
    const chart = init(element.current);
    instance.current = chart;
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
      series: traces.map((trace) => ({
        ...trace,
        type: 'line',
        showSymbol: true,
        symbol: 'circle',
        symbolSize: mode === 'distance' ? 6 : 8,
        triggerEvent: 'line',
        connectNulls: false,
        lineStyle: { width: 1.6, opacity: 0.65 },
        itemStyle: { color: trace.color },
        emphasis: {
          focus: mode === 'distance' ? 'series' : 'self',
          lineStyle: { width: 3.5, opacity: 1 },
          itemStyle: {
            borderColor: '#183e36',
            borderWidth: 2,
            shadowBlur: 8,
            shadowColor: '#08796e55',
          },
        },
      })),
    });
    /** Resolve measured points even when the line's hit area sits above a small symbol. */
    function hoverPoint(params: unknown) {
      const event = params as {
        seriesIndex?: number;
        dataIndex?: number;
        event?: { offsetX: number; offsetY: number };
      };
      const trace = traces[event.seriesIndex ?? -1];
      let point = trace?.data[event.dataIndex ?? -1];
      if (!point && trace && event.event) {
        let closest = 10;
        for (const candidate of trace.data) {
          const [x, y] = chart.convertToPixel(
            { seriesIndex: event.seriesIndex },
            candidate.value,
          ) as number[];
          const distance = Math.hypot(x! - event.event.offsetX, y! - event.event.offsetY);
          if (distance <= closest) {
            point = candidate;
            closest = distance;
          }
        }
      }
      onHoverShot(trace?.shotId ?? point?.shotId ?? null);
      const measured = point;
      if (!measured) {
        setDetails(null);
        return;
      }
      const [x, y] = chart.convertToPixel(
        { seriesIndex: event.seriesIndex },
        measured.value,
      ) as number[];
      setDetails((current) =>
        current?.traces === traces && current.point === measured
          ? current
          : {
              traces,
              point: measured,
              left: Math.max(8, Math.min((x ?? 0) + 12, chart.getWidth() - 256)),
              top: Math.max(8, (y ?? 0) - 140),
            },
      );
    }
    /** Release both linked emphasis and point details when leaving a trace or the canvas. */
    function leavePoint() {
      setDetails(null);
      onHoverShot(null);
    }
    chart.on('mouseover', hoverPoint);
    chart.on('mousemove', hoverPoint);
    chart.on('click', hoverPoint);
    chart.on('mouseout', leavePoint);
    chart.on('globalout', leavePoint);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      chart.dispose();
      instance.current = null;
    };
  }, [traces, mode, onHoverShot]);

  useEffect(() => {
    const chart = instance.current;
    if (!chart) return;
    // Hover changes emphasis only; it must not recreate the canvas or reset the user's zoom.
    chart.dispatchAction({ type: 'downplay' });
    if (activeShotId)
      for (const target of findShotTargets(traces, activeShotId)) {
        chart.dispatchAction({ type: 'highlight', ...target });
      }
  }, [activeShotId, traces]);
  return (
    <div className="chart-frame">
      <div
        className="measurement-chart"
        ref={element}
        role="img"
        aria-label="Recorded velocity chart. Use Table for individual values."
      />
      {details?.traces === traces && (
        <div
          className="point-tooltip"
          role="tooltip"
          style={{ left: details.left, top: details.top }}
        >
          {/* React text escapes imported names; never inject provider content as tooltip HTML. */}
          {formatPointTooltip(details.point)}
        </div>
      )}
    </div>
  );
}
