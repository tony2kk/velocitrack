import type { EChartsCoreOption } from 'echarts/core';
import type { AnalysisMode, ChartSettings, Series, UnitSystem } from '../domain/model';
import type { ChartMode, ChartTrace } from '../domain/chart';
import { quantityLabel, type Quantity } from '../domain/analysis';
import { distanceCurveRegistry, distanceAxisIndex } from '../domain/distanceCurves/registry';
import { formatQuantity, unitLabels } from '../domain/units';
import {
  displayRange,
  fitRange,
  retainViewport,
  zoomPercent,
  type AxisViewport,
  type DisplayScale,
} from '../domain/chartViewport';

/** The same plotted data and display rules drive interactive charts and template report images. */
export interface ChartPresentation {
  traces: ChartTrace[];
  series: Series[];
  mode: ChartMode;
  settings?: ChartSettings;
  kind: AnalysisMode;
  unitSystem: UnitSystem;
  dark?: boolean;
  quantities?: Quantity[];
}

/** Canonical fitted extents, including displayed zero for bars and downward positive drop axes. */
export function chartAxes({
  traces,
  series,
  mode,
  settings,
  kind,
  unitSystem,
  quantities,
}: ChartPresentation) {
  const xKey =
    mode === 'distance'
      ? 'distance'
      : mode === 'string'
        ? 'strings'
        : kind === 'compare'
          ? 'string-order'
          : 'shot-order';
  const xScale = { factor: mode === 'distance' && unitSystem === 'metric' ? 0.3048 : 1, offset: 0 };
  const fittedX: [number, number] | null =
    mode === 'string'
      ? [0.5, series.length + 0.5]
      : fitRange(
          traces.flatMap((trace) => trace.data.map((point) => point.value[0] / xScale.factor)),
          true,
        );
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
  const downward = yQuantities.map(
    (quantity) => mode === 'distance' && distanceCurveRegistry.get(quantity)?.axisKey === 'drop',
  );
  const fittedY = yQuantities.map((quantity, index) => {
    const key =
      mode === 'distance' ? (distanceCurveRegistry.get(quantity)?.axisKey ?? quantity) : quantity;
    const scale = scales[index]!;
    const range = fitRange(
      traces
        .filter((trace) => (trace.yAxisIndex ?? 0) === index)
        .flatMap((trace) =>
          trace.data.map((point) =>
            point.value[1] === null ? null : (point.value[1] - scale.offset) / scale.factor,
          ),
        ),
    );
    if (downward[index] && range) range[0] = 0;
    if (mode === 'string' && range) {
      const baseline = -scale.offset / scale.factor;
      range[0] = Math.min(baseline, range[0]);
      range[1] = Math.max(baseline, range[1]);
    }
    return { key: `${xKey}:y:${key}`, range };
  });
  return { xKey, xScale, fittedX, yQuantities, scales, downward, fittedY };
}

/** Share chart rendering while allowing Quick report to retain its exact interactive viewport. */
export function measurementChartOption(
  input: ChartPresentation,
  viewport?: { x: AxisViewport; y: AxisViewport[] },
): EChartsCoreOption {
  const { traces, series, mode, settings, kind, unitSystem, quantities, dark = false } = input;
  const { xKey, xScale, fittedX, yQuantities, scales, downward, fittedY } = chartAxes(input);
  const x = viewport?.x ?? retainViewport(new Map(), xKey, fittedX);
  const y = viewport?.y ?? fittedY.map((axis) => retainViewport(new Map(), axis.key, axis.range));
  const [xStart, xEnd] = zoomPercent(x);
  const [yStart, yEnd] = zoomPercent(y[0]!);
  const xExtent = displayRange(x.extent, xScale);
  return {
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
          : mode === 'string'
            ? 'String'
            : settings && kind !== 'compare'
              ? 'Shot sequence'
              : settings
                ? 'Shot order within string'
                : 'Shot number',
      nameLocation: 'middle',
      nameGap: 32,
      minInterval: mode !== 'distance' ? 1 : undefined,
      axisLine: { lineStyle: { color: dark ? '#6b8078' : '#dae3df' } },
      splitLine: { show: false },
      axisLabel: {
        hideOverlap: true,
        ...(mode === 'string' ? { width: 120, overflow: 'truncate' as const } : {}),
        formatter: (value: number) =>
          mode === 'string'
            ? ([...series].sort((a, b) => a.id.localeCompare(b.id))[value - 1]?.name ?? '')
            : formatQuantity(
                value,
                mode !== 'distance' ? 'count' : 'distance',
                mode === 'distance' ? unitLabels[unitSystem].distance : '',
              ),
      },
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
            : formatQuantity(
                value,
                quantity,
                mode === 'distance'
                  ? distanceCurveRegistry.get(quantity)?.unit?.(unitSystem)
                  : quantities?.find((item) => item.id === quantity)?.unit,
              ),
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
      type: mode === 'string' ? 'bar' : 'line',
      // Each string owns one series for identity/hover. Overlay their slots to center each
      // isolated bar on its numeric string index rather than offsetting it by series order.
      barGap: '-100%',
      barMaxWidth: 64,
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
  };
}
