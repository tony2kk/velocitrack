import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import { RotateCcw } from 'lucide-react';
import { init, use as registerCharts, type EChartsType } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { AriaComponent, GridComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { AnalysisMode, ChartSettings, Series, Shot, UnitSystem } from '../domain/model';
import { quantityLabel, type Quantity } from '../domain/analysis';
import { formatValue, unitLabels } from '../domain/units';
import { distanceCurveRegistry, distanceAxisIndex } from '../domain/distanceCurves/registry';
import type { DistanceCurveData } from '../domain/distanceCurves/types';
import {
  alignExtent,
  applyZoom,
  displayRange,
  fitRange,
  retainViewport,
  setRightEdge,
  zoomPercent,
  type AxisViewport,
  type DisplayScale,
  type ViewportMemory,
} from '../domain/chartViewport';
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

/** A fresh, unhovered print image of the current viewport; no screenshot of UI chrome. */
export interface MeasurementChartHandle {
  capture: () => string;
}

/** Render measured points and bridge ECharts hover events to the shared shot identity. */
export default function MeasurementChart({
  ref,
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
  curveData,
  viewportMemory,
  forecastDistance,
  onForecastDistanceChange,
}: {
  ref?: Ref<MeasurementChartHandle>;
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
  curveData?: Omit<DistanceCurveData, 'series'>;
  viewportMemory?: ViewportMemory;
  /** Existing forecast field, in canonical feet; this component only coordinates the viewport. */
  forecastDistance?: number;
  onForecastDistanceChange?: (distance: number) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<EChartsType | null>(null);
  useImperativeHandle(ref, () => ({
    capture: () => {
      const current = instance.current;
      if (!current) throw new Error('The chart is still loading. Try again in a moment.');
      const host = document.createElement('div');
      const copy = init(host, undefined, { width: 1400, height: 600, renderer: 'canvas' });
      const option = current.getOption();
      // Retain exact zoom percentages/extents; only print colors and navigation chrome change.
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
    },
  }));
  const [ownMemory] = useState<ViewportMemory>(() => new Map());
  const memory = viewportMemory ?? ownMemory;
  const axes = useRef<{ x: AxisViewport; y: AxisViewport[] } | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const lastReset = useRef(0);
  const resetDistance = useRef<number | undefined>(undefined);
  const lastForecast = useRef<{ kind: AnalysisMode; distance?: number } | null>(null);
  const zoomTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
            distanceCurveRegistry,
            curveData,
          )
        : buildChartTraces(shots, series, mode, unitSystem),
    [shots, series, mode, unitSystem, settings, kind, dark, quantities, colorOrder, curveData],
  );
  /** Commit a settled horizontal gesture once; vertical changes never rewrite the distance field. */
  const commitDistance = useEffectEvent(() => {
    const end = axes.current?.x.window[1];
    if (
      forecastDistance !== undefined &&
      end !== undefined &&
      end > 0 &&
      Math.abs(end - forecastDistance) > Math.max(1, end) * 1e-10
    )
      onForecastDistanceChange?.(end);
  });

  /** Capture the library's public zoom state against our explicit canonical axis domains. */
  const captureZoom = useEffectEvent(() => {
    leavePoint();
    const current = axes.current;
    if (!current || !instance.current) return;
    const options = instance.current.getOption() as {
      dataZoom?: { id?: string; start?: number; end?: number }[];
    };
    const horizontal = options.dataZoom?.find((zoom) => zoom.id === 'distance-zoom');
    const vertical = options.dataZoom?.find((zoom) => zoom.id === 'velocity-zoom');
    const previousEnd = current.x.window[1];
    if (horizontal) applyZoom(current.x, horizontal.start, horizontal.end);
    if (vertical) for (const axis of current.y) applyZoom(axis, vertical.start, vertical.end);
    if (current.x.window[1] !== previousEnd) {
      clearTimeout(zoomTimer.current);
      // Wheel gestures may emit many updates; avoid a database write and redraw for every pixel.
      zoomTimer.current = setTimeout(commitDistance, 180);
    }
  });

  useEffect(() => {
    if (!element.current) return;
    const chart = init(element.current);
    instance.current = chart;
    chart.on('mouseover', hoverPoint);
    chart.on('mousemove', hoverPoint);
    chart.on('click', hoverPoint);
    chart.on('mouseout', leavePoint);
    chart.on('globalout', leavePoint);
    chart.on('datazoom', captureZoom);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element.current);
    return () => {
      clearTimeout(zoomTimer.current);
      observer.disconnect();
      chart.dispose();
      instance.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = instance.current;
    if (!chart) return;
    const requestedReset = lastReset.current !== resetCount;
    const completedReset =
      resetDistance.current !== undefined && forecastDistance === resetDistance.current;
    const reset = requestedReset || completedReset;
    lastReset.current = resetCount;
    if (completedReset || lastForecast.current?.distance !== forecastDistance)
      resetDistance.current = undefined;
    const xKey =
      mode === 'distance' ? 'distance' : kind === 'compare' ? 'string-order' : 'shot-order';
    const xScale = {
      factor: mode === 'distance' && unitSystem === 'metric' ? 0.3048 : 1,
      offset: 0,
    };
    const hadX = memory.has(xKey);
    const x = retainViewport(
      memory,
      xKey,
      fitRange(
        traces.flatMap((trace) => trace.data.map((point) => point.value[0] / xScale.factor)),
        true,
      ),
      reset,
    );
    const previousForecast = lastForecast.current;
    if (
      forecastDistance !== undefined &&
      ((!hadX && !reset) ||
        (!reset &&
          previousForecast?.kind === kind &&
          previousForecast.distance !== undefined &&
          previousForecast.distance !== forecastDistance))
    )
      setRightEdge(x, forecastDistance);
    lastForecast.current = { kind, distance: forecastDistance };

    const yQuantities =
      settings &&
      kind === 'dual' &&
      settings.quantity !== settings.secondary &&
      (mode === 'shot' || distanceAxisIndex(settings.quantity, settings.secondary) === 1)
        ? [settings.quantity, settings.secondary]
        : [settings?.quantity ?? 'velocity'];
    const scales: DisplayScale[] = yQuantities.map((quantity) =>
      mode === 'distance' && distanceCurveRegistry.get(quantity)
        ? distanceCurveRegistry.get(quantity)!.displayScale(unitSystem)
        : quantity === 'velocity'
          ? { factor: unitSystem === 'metric' ? 0.3048 : 1, offset: 0 }
          : (quantities?.find((item) => item.id === quantity)?.displayScale ?? {
              factor: 1,
              offset: 0,
            }),
    );
    // Drop retains positive values; only its shared physical axis runs downward on screen.
    const downward = yQuantities.map(
      (quantity) => mode === 'distance' && distanceCurveRegistry.get(quantity)?.axisKey === 'drop',
    );
    const y = yQuantities.map((quantity, index) => {
      // Recorded and calculated velocities have the same dimension and share one numerical scale.
      const key =
        mode === 'distance' ? (distanceCurveRegistry.get(quantity)?.axisKey ?? quantity) : quantity;
      const scale = scales[index]!;
      const fitted = fitRange(
        traces
          .filter((trace) => (trace.yAxisIndex ?? 0) === index)
          .flatMap((trace) =>
            trace.data.map((point) =>
              point.value[1] === null ? null : (point.value[1] - scale.offset) / scale.factor,
            ),
          ),
      );
      // Fit/reset starts exactly at the muzzle plane, without negative padding above zero.
      // Existing zoom windows remain untouched until the user explicitly resets the scales.
      if (downward[index] && fitted) fitted[0] = 0;
      return retainViewport(memory, `${xKey}:y:${key}`, fitted, reset);
    });
    const [yStart, yEnd] = zoomPercent(y[0]!);
    for (const secondary of y.slice(1)) alignExtent(secondary, [yStart, yEnd]);
    axes.current = { x, y };
    // Reset can extend the linked right edge. Fit again when that edit supplies its new plotted data.
    if (requestedReset && forecastDistance !== undefined && x.window[1] !== forecastDistance)
      resetDistance.current = x.window[1];
    const [xStart, xEnd] = zoomPercent(x);
    const xExtent = displayRange(x.extent, xScale);
    chart.setOption(
      {
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
          min: xExtent[0],
          max: xExtent[1],
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
          axisLabel: { hideOverlap: true, formatter: (value: number) => formatValue(value, 2) },
        },
        yAxis: yQuantities.map((quantity, index) => ({
          type: 'value',
          inverse: downward[index],
          nameLocation: downward[index] ? 'start' : 'end',
          min: displayRange(y[index]!.extent, scales[index]!)[0],
          max: displayRange(y[index]!.extent, scales[index]!)[1],
          name:
            quantities?.find((item) => item.id === quantity)?.label ??
            quantityLabel(quantity, unitSystem),
          position: index === 0 ? 'left' : 'right',
          nameTextStyle: { width: 170, overflow: 'truncate' },
          scale: true,
          splitLine: { show: index === 0, lineStyle: { color: dark ? '#34443e' : '#edf1ef' } },
          axisLabel: {
            hideOverlap: true,
            showMaxLabel: false,
            // Exact viewport edges are not useful ticks. Keep a zero baseline, including on
            // inverted drop axes; the formatter also handles new edges during live zoom.
            formatter: (value: number, tickIndex: number) =>
              tickIndex === 0 && value !== 0
                ? ''
                : formatValue(value, quantity === 'velocity' ? 2 : 6),
          },
        })),
        dataZoom: [
          {
            id: 'inside-zoom',
            type: 'inside',
            xAxisIndex: 0,
            filterMode: 'none',
            start: xStart,
            end: xEnd,
          },
          {
            id: 'distance-zoom',
            type: 'slider',
            xAxisIndex: 0,
            filterMode: 'none',
            start: xStart,
            end: xEnd,
            realtime: true,
            height: 14,
            bottom: 6,
            borderColor: 'transparent',
            fillerColor: '#0c817622',
          },
          {
            id: 'velocity-zoom',
            type: 'slider',
            orient: 'vertical',
            yAxisIndex: yQuantities.map((_, index) => index),
            // Zoom clips the viewport without deleting samples or changing linked shot identities.
            filterMode: 'none',
            start: yStart,
            end: yEnd,
            realtime: true,
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
          showSymbol: !trace.data[0]?.derived && !trace.data[0]?.model,
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
      },
      { notMerge: true, silent: true },
    );
    commitDistance();
  }, [
    traces,
    mode,
    unitSystem,
    settings,
    kind,
    dark,
    quantities,
    memory,
    resetCount,
    forecastDistance,
  ]);

  /** Resolve measured points even when the line's hit area sits above a small symbol. */
  const hoverPoint = useEffectEvent((params: unknown) => {
    const chart = instance.current;
    if (!chart) return;
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
  });
  /** Release both linked emphasis and point details when leaving a trace or the canvas. */
  const leavePoint = useEffectEvent(() => {
    setDetails(null);
    if (onHoverShots) onHoverShots([]);
    else onHoverShot(null);
  });

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
  }, [activeShotId, activeShotIds, traces, resetCount]);
  return (
    <div className="chart-frame">
      <div
        className="measurement-chart"
        ref={element}
        role="img"
        aria-label="Recorded measurement chart. Shot records below contain individual values."
        aria-description="Hover a point for details. Drag the bottom slider to change the horizontal range; use the right slider for vertical zoom."
      />
      <button
        type="button"
        className="chart-reset icon-button"
        aria-label="Reset chart scales"
        title="Reset both axes to fit the currently available chart data."
        onClick={() => {
          clearTimeout(zoomTimer.current);
          setDetails(null);
          setResetCount((count) => count + 1);
        }}
      >
        <RotateCcw size={17} aria-hidden="true" />
      </button>
      {[...new Set(traces.flatMap((trace) => (trace.issue ? [trace.issue] : [])))].map((issue) => (
        <p className="error" role="alert" key={issue}>
          {issue}
        </p>
      ))}
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
