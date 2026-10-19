import { useEffect, useMemo, useRef, useState } from 'react';
import { init, use as registerCharts, type EChartsType } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { AriaComponent, GridComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { AnalysisMode, ChartSettings, Series, Shot, UnitSystem } from '../domain/model';
import { quantityLabel, type Quantity } from '../domain/analysis';
import { formatValue, unitLabels } from '../domain/units';
import {
  buildChartTraces,
  buildAnalysisTraces,
  findShotTargets,
  pointShotIds,
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
  activeShotIds,
  onHoverShots,
  onHoverShot,
  unitSystem = 'imperial',
  settings,
  kind = 'simple',
  dark = false,
  quantities,
  colorOrder,
}: {
  shots: Shot[];
  series: Series[];
  mode: ChartMode;
  activeShotId: string | null;
  activeShotIds?: string[];
  onHoverShots?: (ids: string[]) => void;
  onHoverShot: (id: string | null) => void;
  unitSystem?: UnitSystem;
  settings?: ChartSettings;
  kind?: AnalysisMode;
  dark?: boolean;
  quantities?: Quantity[];
  colorOrder?: string[];
}) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<EChartsType | null>(null);
  const [details, setDetails] = useState<{
    traces: ChartTrace[];
    point: ChartPoint;
    left: number;
    top: number;
  } | null>(null);
  const traces = useMemo(
    () =>
      settings
        ? buildAnalysisTraces(
            shots,
            series,
            kind,
            settings,
            unitSystem,
            dark,
            quantities,
            colorOrder,
          )
        : buildChartTraces(shots, series, mode, unitSystem),
    [shots, series, mode, unitSystem, settings, kind, dark, quantities, colorOrder],
  );
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
            'Recorded measurements. An accessible shot table is available below the chart.',
        },
      },
      textStyle: { fontFamily: 'system-ui, sans-serif', color: dark ? '#c5d2cf' : '#63716e' },
      grid: { left: 74, right: kind === 'dual' ? 100 : 64, top: 48, bottom: 75 },
      xAxis: {
        type: 'value',
        name:
          mode === 'distance'
            ? `Distance (${unitLabels[unitSystem].distance})`
            : settings && kind !== 'compare'
              ? 'Shot sequence'
              : settings
                ? 'Shot order within string'
                : 'Shot number',
        nameLocation: 'middle',
        nameGap: 32,
        minInterval: mode === 'shot' ? 1 : undefined,
        axisLine: { lineStyle: { color: dark ? '#6b8078' : '#dae3df' } },
        splitLine: { show: false },
        axisLabel: { formatter: (value: number) => formatValue(value, 2) },
      },
      yAxis: (settings &&
      kind === 'dual' &&
      mode === 'shot' &&
      settings.quantity !== settings.secondary
        ? [settings.quantity, settings.secondary]
        : [settings?.quantity ?? 'velocity']
      ).map((quantity, index) => ({
        type: 'value',
        name:
          quantities?.find((item) => item.id === quantity)?.label ??
          quantityLabel(quantity, unitSystem),
        position: index === 0 ? 'left' : 'right',
        nameTextStyle: { width: 170, overflow: 'truncate' },
        scale: true,
        splitLine: { show: index === 0, lineStyle: { color: dark ? '#34443e' : '#edf1ef' } },
        axisLabel: {
          formatter: (value: number) => formatValue(value, quantity === 'velocity' ? 2 : 6),
        },
      })),
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
        {
          id: 'distance-zoom',
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'none',
          height: 14,
          bottom: 6,
          borderColor: 'transparent',
          fillerColor: '#0c817622',
        },
        {
          id: 'velocity-zoom',
          type: 'slider',
          orient: 'vertical',
          yAxisIndex:
            settings &&
            kind === 'dual' &&
            mode === 'shot' &&
            settings.quantity !== settings.secondary
              ? [0, 1]
              : [0],
          // Zoom clips the viewport without deleting samples or changing linked shot identities.
          filterMode: 'none',
          width: 14,
          right: 8,
          top: 32,
          bottom: 75,
          borderColor: 'transparent',
          fillerColor: '#0c817622',
        },
      ],
      series: traces.map((trace) => ({
        ...trace,
        type: 'line',
        showSymbol: true,
        symbol: trace.symbol ?? 'circle',
        symbolSize: mode === 'distance' ? 6 : 8,
        triggerEvent: 'line',
        connectNulls: false,
        lineStyle: { width: 2, opacity: 0.9, type: trace.dash ?? 'solid' },
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
          if (candidate.value[1] === null) continue;
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
      if (point?.value[1] === null) point = undefined;
      const ids = trace ? pointShotIds(trace, point) : [];
      if (onHoverShots) onHoverShots(ids);
      else onHoverShot(ids[0] ?? null);
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
      if (onHoverShots) onHoverShots([]);
      else onHoverShot(null);
    }
    chart.on('mouseover', hoverPoint);
    chart.on('mousemove', hoverPoint);
    chart.on('click', hoverPoint);
    chart.on('mouseout', leavePoint);
    chart.on('globalout', leavePoint);
    chart.on('datazoom', leavePoint);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      chart.dispose();
      instance.current = null;
    };
  }, [traces, mode, onHoverShot, onHoverShots, unitSystem, settings, kind, dark, quantities]);

  useEffect(() => {
    const chart = instance.current;
    if (!chart) return;
    // Hover changes emphasis only; it must not recreate the canvas or reset the user's zoom.
    chart.dispatchAction({ type: 'downplay' });
    if (activeShotIds && activeShotIds.length > 1) {
      const ids = new Set(activeShotIds);
      // An aggregate hover represents many rows; emphasize its curve once, not shots × grid points.
      traces.forEach((trace, seriesIndex) => {
        if (trace.members?.some((member) => ids.has(member.shotId)))
          chart.dispatchAction({ type: 'highlight', seriesIndex });
      });
    } else if (activeShotId)
      for (const target of findShotTargets(traces, activeShotId)) {
        chart.dispatchAction({ type: 'highlight', ...target });
      }
  }, [activeShotId, activeShotIds, traces]);
  return (
    <div className="chart-frame">
      <div
        className="measurement-chart"
        ref={element}
        role="img"
        aria-label="Recorded measurement chart. Shot records below contain individual values."
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
