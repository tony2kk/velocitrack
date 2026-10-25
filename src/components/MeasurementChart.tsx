import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
  type CSSProperties,
} from 'react';
import { RotateCcw } from 'lucide-react';
import type { EChartsType } from 'echarts/core';
import { init, renderChartImage } from '../charts/engine';
import { chartAxes, measurementChartOption } from '../charts/options';
import type { AnalysisMode, ChartSettings, Series, Shot, UnitSystem } from '../domain/model';
import { type Quantity } from '../domain/analysis';
import { distanceCurveRegistry } from '../domain/distanceCurves/registry';
import type { DistanceCurveData } from '../domain/distanceCurves/types';
import {
  alignExtent,
  applyZoom,
  retainViewport,
  setRightEdge,
  zoomPercent,
  type AxisViewport,
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

/** A fresh, unhovered print image of the current viewport; no screenshot of UI chrome. */
export interface MeasurementChartHandle {
  capture: (height?: number) => string;
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
  fitOnMount = false,
  heightPercent = 100,
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
  /** A new selection fits all plotted samples rather than restoring an unrelated forecast window. */
  fitOnMount?: boolean;
  /** Local display preference; resizing must not alter the numerical viewport. */
  heightPercent?: number;
  /** Existing forecast field, in canonical feet; this component only coordinates the viewport. */
  forecastDistance?: number;
  onForecastDistanceChange?: (distance: number) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<EChartsType | null>(null);
  useImperativeHandle(ref, () => ({
    capture: (height = 780) => {
      const current = instance.current;
      if (!current) throw new Error('The chart is still loading. Try again in a moment.');
      return renderChartImage(current.getOption(), kind, height);
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
    const requestedReset =
      lastReset.current !== resetCount || (fitOnMount && !axes.current && memory.size === 0);
    const completedReset =
      resetDistance.current !== undefined && forecastDistance === resetDistance.current;
    const reset = requestedReset || completedReset;
    lastReset.current = resetCount;
    if (completedReset || lastForecast.current?.distance !== forecastDistance)
      resetDistance.current = undefined;
    const presentation = { traces, series, mode, settings, kind, unitSystem, dark, quantities };
    const { xKey, fittedX, fittedY } = chartAxes(presentation);
    const hadX = memory.has(xKey);
    const x = retainViewport(memory, xKey, fittedX, reset);
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

    const y = fittedY.map((axis) => retainViewport(memory, axis.key, axis.range, reset));
    const [yStart, yEnd] = zoomPercent(y[0]!);
    for (const secondary of y.slice(1)) alignExtent(secondary, [yStart, yEnd]);
    axes.current = { x, y };
    // Reset can extend the linked right edge. Fit again when that edit supplies its new plotted data.
    if (requestedReset && forecastDistance !== undefined && x.window[1] !== forecastDistance)
      resetDistance.current = x.window[1];
    chart.setOption(measurementChartOption(presentation, { x, y }), {
      notMerge: true,
      silent: true,
    });
    commitDistance();
  }, [
    traces,
    series,
    mode,
    unitSystem,
    settings,
    kind,
    dark,
    quantities,
    memory,
    resetCount,
    forecastDistance,
    fitOnMount,
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
    <div
      className="chart-frame"
      style={{ '--chart-height-scale': heightPercent / 100 } as CSSProperties}
    >
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
