import type { AnalysisMode, ChartQuantity, ChartSettings, Series, Shot, UnitSystem } from './model';
import { quantityDisplay, quantityLabel, shotQuantity, type Quantity } from './analysis';
import { inspectPoints } from './measurements';
import { displayValue, formatValue, unitLabels } from './units';
import {
  calculatedVelocity,
  predictionInputs,
  velocityModel,
  type DragModel,
} from './calculatedVelocity';

export type ChartMode = 'distance' | 'shot';
// Alternating hue families separate neighboring traces; shape and dash also encode identity.
export const chartColors = [
  '#2563eb',
  '#c26a00',
  '#9333ea',
  '#d52d72',
  '#087f8c',
  '#bd4030',
  '#536174',
  '#827300',
];
const darkColors = [
  '#75a7ff',
  '#ffb454',
  '#c69aff',
  '#ff85b5',
  '#54d0db',
  '#ff927c',
  '#bbc8dd',
  '#dfd36a',
];
/** Repeat colors only after a full palette, then vary symbols and dashes as a second cue. */
export function chartStyle(index: number, dark = false) {
  return {
    color: (dark ? darkColors : chartColors)[index % chartColors.length]!,
    symbol: ['circle', 'rect', 'triangle', 'diamond', 'pin', 'roundRect'][index % 6]!,
    dash: (['solid', 'dashed', 'dotted'] as const)[Math.floor(index / chartColors.length) % 3]!,
  };
}

/** A rendered point retains its shot identity and original sample position after padding removal. */
export interface ChartPoint {
  value: [number, number | null];
  shotId: string;
  shotNumber: number;
  seriesName: string;
  rawUnit: string;
  unitSystem: UnitSystem;
  sampleIndex?: number;
  quantity?: ChartQuantity;
  contributors?: number;
  distance?: boolean;
  quantityTitle?: string;
  model?: DragModel;
  coefficient?: number;
}

/** Distance traces own one shot; muzzle traces contain independently identifiable shots. */
export interface ChartTrace {
  id: string;
  name: string;
  color: string;
  shotId?: string;
  data: ChartPoint[];
  yAxisIndex?: number;
  symbol?: string;
  dash?: 'solid' | 'dashed' | 'dotted';
  /** Measured coverage links averaged distance points without storing shots × grid identities. */
  members?: { shotId: string; from: number; to: number }[];
}

/** Build identity-aware plotted values using the existing provider exclusion and padding rules. */
export function buildChartTraces(
  shots: Shot[],
  series: Series[],
  mode: ChartMode,
  units: UnitSystem = 'imperial',
): ChartTrace[] {
  const names = new Map(series.map((item) => [item.id, item.name]));
  const included = shots.filter((shot) => !shot.excluded);
  /** Attach UI identity independently of shot numbers, which may repeat across series. */
  function point(shot: Shot, value: [number, number], sampleIndex?: number): ChartPoint {
    return {
      value: [
        mode === 'distance' ? displayValue(value[0], 'distance', units)! : value[0],
        displayValue(value[1], 'velocity', units)!,
      ],
      shotId: shot.id,
      shotNumber: shot.number,
      seriesName: names.get(shot.seriesId) ?? 'Series',
      rawUnit: shot.rawUnit,
      unitSystem: units,
      sampleIndex,
    };
  }
  if (mode === 'distance')
    return included.slice(0, 100).map((shot) => ({
      id: shot.id,
      shotId: shot.id,
      name: `${names.get(shot.seriesId)} · shot ${shot.number}`,
      color:
        chartColors[
          Math.max(
            0,
            series.findIndex((item) => item.id === shot.seriesId),
          ) % chartColors.length
        ]!,
      data: inspectPoints(shot).points.map((sample) =>
        point(shot, [sample.distance, sample.velocity], sample.index),
      ),
    }));
  return series.map((item, index) => ({
    id: item.id,
    name: item.name,
    color: chartColors[index % chartColors.length]!,
    data: included
      .filter(
        (shot) =>
          shot.seriesId === item.id &&
          shot.muzzleVelocity !== null &&
          Number.isFinite(shot.muzzleVelocity) &&
          shot.muzzleVelocity > 0,
      )
      .sort((a, b) => a.number - b.number || a.id.localeCompare(b.id))
      .map((shot) => point(shot, [shot.number, shot.muzzleVelocity!])),
  }));
}

/** Describe one measured sample in the chosen display units; its stored raw values remain unchanged. */
export function formatPointTooltip(point: ChartPoint): string {
  const distance = point.distance || point.sampleIndex !== undefined;
  return [
    point.seriesName,
    point.contributors
      ? `${point.model ? 'Mean prediction' : 'Mean'} of ${point.contributors} shots`
      : `Shot ${point.shotNumber}${point.sampleIndex !== undefined ? ` · Sample ${point.sampleIndex + 1}` : ''}`,
    ...(distance
      ? [`Distance: ${formatValue(point.value[0])} ${unitLabels[point.unitSystem].distance}`]
      : []),
    ...(point.model
      ? [
          `${point.model.toUpperCase()} model · standard atmosphere${point.coefficient ? ` · BC ${formatValue(point.coefficient)}` : ''}`,
        ]
      : []),
    point.quantity && point.quantity !== 'velocity'
      ? `${point.quantityTitle ?? quantityLabel(point.quantity, point.unitSystem)}: ${formatValue(point.value[1])}`
      : `Velocity: ${formatValue(point.value[1])} ${unitLabels[point.unitSystem].velocity}`,
  ].join('\n');
}

/** Preserve table order; comparison curves use each string's rank rather than original shot numbers. */
export function buildAnalysisTraces(
  shots: Shot[],
  series: Series[],
  kind: AnalysisMode,
  settings: ChartSettings,
  units: UnitSystem,
  dark = false,
  definitions?: Quantity[],
  colorOrder?: string[],
): ChartTrace[] {
  const included = shots.filter((shot) => !shot.excluded);
  const names = new Map(series.map((item) => [item.id, item.name]));
  const groups = [...series].sort((a, b) => a.id.localeCompare(b.id));
  /** Full-workspace ordering keeps a string's color stable while the selection changes. */
  function style(id: string, fallback: number) {
    return chartStyle(Math.max(0, colorOrder?.indexOf(id) ?? fallback), dark);
  }
  const quantities =
    kind === 'dual' && settings.secondary !== settings.quantity
      ? [settings.quantity, settings.secondary]
      : [settings.quantity];
  if (settings.axis === 'distance') {
    return quantities.flatMap<ChartTrace>((quantity, quantityIndex) => {
      const model = velocityModel(quantity);
      // Bound model work before integration, including comparison; never compute every selected forecast.
      const candidates = model
        ? included.filter((shot) => predictionInputs(shot, model)).slice(0, 100)
        : kind === 'compare'
          ? included
          : included.slice(0, 100);
      const rows = model
        ? candidates.map((shot) => {
            const points = calculatedVelocity(shot, model, settings.forecastDistance);
            return {
              ...shot,
              distances: points.map((point) => point.distance),
              velocities: points.map((point) => point.velocity),
            };
          })
        : candidates;
      if (kind === 'compare')
        return groups.map((item, index) => {
          const members = rows.filter((shot) => shot.seriesId === item.id);
          return {
            id: item.id,
            name: item.name,
            ...style(item.id, index),
            ...(model ? { dash: 'dashed' as const } : {}),
            data: meanDistancePoints(members, item.name, units).map((point) => ({
              ...point,
              model: model ?? undefined,
              quantity,
              quantityTitle: quantityLabel(quantity, units),
            })),
            members: members.flatMap((shot) => {
              const distances = inspectPoints(shot).points.map((point) =>
                displayValue(point.distance, 'distance', units)!,
              );
              return distances.length
                ? [
                    {
                      shotId: shot.id,
                      from: distances.reduce((a, b) => Math.min(a, b)),
                      to: distances.reduce((a, b) => Math.max(a, b)),
                    },
                  ]
                : [];
            }),
          };
        });
      return buildChartTraces(rows, series, 'distance', units).map((trace) => ({
        ...trace,
        id: `${quantity}:${trace.id}`,
        ...chartStyle(quantityIndex, dark),
        ...(model ? { dash: 'dashed' as const } : {}),
        data: trace.data.map((point) => ({
          ...point,
          sampleIndex: model ? undefined : point.sampleIndex,
          distance: true,
          model: model ?? undefined,
          coefficient: model
            ? ((model === 'g1'
                ? candidates.find((shot) => shot.id === point.shotId)?.ballisticCoefficientG1
                : candidates.find((shot) => shot.id === point.shotId)?.ballisticCoefficientG7) ??
              undefined)
            : undefined,
          quantity,
          quantityTitle: quantityLabel(quantity, units),
        })),
      }));
    });
  }
  const sequence = new Map(included.map((shot, index) => [shot.id, index + 1]));
  /** Keep x positions shared between metrics, even when one reading is missing. */
  function points(rows: Shot[], quantity: ChartQuantity, compare: boolean): ChartPoint[] {
    return rows.flatMap((shot, index) => {
      const definition = definitions?.find((item) => item.id === quantity);
      const value = definition ? definition.read(shot) : fallbackQuantity(shot, quantity, units);
      return [
        {
          value: [compare ? index + 1 : sequence.get(shot.id)!, value] as [number, number | null],
          shotId: shot.id,
          shotNumber: shot.number,
          seriesName: names.get(shot.seriesId) ?? 'Series',
          rawUnit: shot.rawUnit,
          unitSystem: units,
          quantity,
          quantityTitle: definition?.label,
        },
      ];
    });
  }
  if (kind === 'compare')
    return groups.map((item, index) => ({
      id: item.id,
      name: item.name,
      ...style(item.id, index),
      data: points(
        included.filter((shot) => shot.seriesId === item.id),
        settings.quantity,
        true,
      ),
    }));
  return quantities.map((quantity, index) => ({
    id: quantity,
    name:
      definitions?.find((item) => item.id === quantity)?.label ?? quantityLabel(quantity, units),
    ...chartStyle(index, dark),
    yAxisIndex: index,
    data: points(included, quantity, false),
  }));
}

/** Legacy callers supply only built-in quantities; unknown definitions have no usable reading. */
function fallbackQuantity(shot: Shot, quantity: string, units: UnitSystem): number | null {
  if (!['velocity', 'g1', 'g7'].includes(quantity)) return null;
  const value = shotQuantity(shot, quantity);
  return value === null ? null : quantityDisplay(value, quantity, units);
}

/**
 * Average interpolated measured segments on a bounded observed-distance grid, never extrapolating.
 * Difference arrays accumulate linear contributions in O(samples log grid), avoiding shots × grid work.
 * Duplicate distances use the last sample; trace coverage resolves the aggregate's contributors lazily.
 */
function meanDistancePoints(shots: Shot[], name: string, units: UnitSystem): ChartPoint[] {
  const rows = shots.map((shot) =>
    [...new Map(inspectPoints(shot).points.map((p) => [p.distance, p.velocity]))].sort(
      (a, b) => a[0] - b[0],
    ),
  );
  const observed = [...new Set(rows.flatMap((row) => row.map(([x]) => x!)))].sort((a, b) => a - b);
  const grid =
    observed.length <= 5000
      ? observed
      : Array.from(
          { length: 5000 },
          (_, index) => observed[Math.round((index * (observed.length - 1)) / 4999)]!,
        );
  const slope = new Float64Array(grid.length + 1);
  const intercept = new Float64Array(grid.length + 1);
  const counts = new Int32Array(grid.length + 1);
  /** Find an inclusive lower or exclusive upper bound in the shared sorted grid. */
  function bound(value: number, upper = false): number {
    let low = 0,
      high = grid.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (grid[mid]! < value || (upper && grid[mid] === value)) low = mid + 1;
      else high = mid;
    }
    return low;
  }
  /** Add a straight segment once; adjacent segments share no duplicated endpoint contribution. */
  function segment(left: number, right: number, m: number, b: number) {
    slope[left]! += m;
    slope[right]! -= m;
    intercept[left]! += b;
    intercept[right]! -= b;
    counts[left]! += 1;
    counts[right]! -= 1;
  }
  for (const row of rows) {
    if (row.length === 1) segment(bound(row[0]![0]!), bound(row[0]![0]!, true), 0, row[0]![1]!);
    for (let index = 1; index < row.length; index++) {
      const [x0, y0] = row[index - 1]! as [number, number];
      const [x1, y1] = row[index]! as [number, number];
      const m = (y1 - y0) / (x1 - x0);
      segment(bound(x0), bound(x1, index === row.length - 1), m, y0 - m * x0);
    }
  }
  let m = 0,
    b = 0,
    count = 0;
  const points = grid.flatMap((x, index) => {
    m += slope[index]!;
    b += intercept[index]!;
    count += counts[index]!;
    return count
      ? [
          {
            value: [
              displayValue(x, 'distance', units)!,
              displayValue((m * x + b) / count, 'velocity', units)!,
            ] as [number, number],
            shotId: '',
            shotNumber: 0,
            seriesName: name,
            rawUnit: '',
            unitSystem: units,
            distance: true,
            contributors: count,
          },
        ]
      : [];
  });
  // Keep disconnected measured ranges disconnected when a string contains non-overlapping traces.
  const intervals = rows
    .filter((row) => row.length)
    .map((row) => [row[0]![0]!, row.at(-1)![0]!] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const gaps: [number, number][] = [];
  let end = intervals[0]?.[1] ?? 0;
  for (const [start, stop] of intervals.slice(1)) {
    if (start > end) gaps.push([end, start]);
    end = Math.max(end, stop);
  }
  let gap = 0;
  return points.flatMap((point, index): ChartPoint[] => {
    const previous = points[index - 1];
    const x = point.value[0];
    const markers: ChartPoint[] = [];
    while (gap < gaps.length && displayValue(gaps[gap]![1], 'distance', units)! <= x) {
      const [left, right] = gaps[gap++]!;
      if (previous && displayValue(left, 'distance', units)! >= previous.value[0])
        markers.push({
          ...point,
          shotId: '',
          value: [displayValue((left + right) / 2, 'distance', units)!, null],
          contributors: 0,
        });
    }
    return [...markers, point];
  });
}

/** Resolve full distance traces or individual muzzle points for linked highlighting. */
export function findShotTargets(traces: ChartTrace[], shotId: string) {
  return traces.flatMap<{ seriesIndex: number; dataIndex?: number }>((trace, seriesIndex) => {
    if (trace.shotId === shotId && trace.data.length)
      return [{ seriesIndex, dataIndex: undefined }];
    const member = trace.members?.find((item) => item.shotId === shotId);
    if (member)
      return trace.data.flatMap((point, dataIndex) =>
        point.value[1] !== null && point.value[0] >= member.from && point.value[0] <= member.to
          ? [{ seriesIndex, dataIndex }]
          : [],
      );
    const dataIndex = trace.data.findIndex(
      (point) => point.shotId === shotId && point.value[1] !== null,
    );
    return dataIndex < 0 ? [] : [{ seriesIndex, dataIndex }];
  });
}

/** Resolve exact contributors at one distance, including single-sample traces and excluding gaps. */
export function pointShotIds(trace: ChartTrace, point?: ChartPoint): string[] {
  if (!point || point.value[1] === null) return [];
  if (trace.shotId || point.shotId) return [trace.shotId || point.shotId];
  return (
    trace.members
      ?.filter((member) => point.value[0] >= member.from && point.value[0] <= member.to)
      .map((member) => member.shotId) ?? []
  );
}
