import type { Series, Shot } from './model';
import { inspectPoints } from './measurements';

export type ChartMode = 'distance' | 'shot';
export const chartColors = ['#0c8176', '#5978c7', '#d38a36', '#ac6399', '#758b3c', '#607b91'];

/** A rendered point retains its shot identity and original sample position after padding removal. */
export interface ChartPoint {
  value: [number, number];
  shotId: string;
  shotNumber: number;
  seriesName: string;
  rawUnit: string;
  sampleIndex?: number;
}

/** Distance traces own one shot; muzzle traces contain independently identifiable shots. */
export interface ChartTrace {
  id: string;
  name: string;
  color: string;
  shotId?: string;
  data: ChartPoint[];
}

/** Build identity-aware plotted values using the existing provider exclusion and padding rules. */
export function buildChartTraces(shots: Shot[], series: Series[], mode: ChartMode): ChartTrace[] {
  const names = new Map(series.map((item) => [item.id, item.name]));
  const included = shots.filter((shot) => !shot.excluded);
  /** Attach UI identity independently of shot numbers, which may repeat across series. */
  function point(shot: Shot, value: [number, number], sampleIndex?: number): ChartPoint {
    return {
      value,
      shotId: shot.id,
      shotNumber: shot.number,
      seriesName: names.get(shot.seriesId) ?? 'Series',
      rawUnit: shot.rawUnit,
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

/** Describe one measured sample without inferred units or loss of original numeric precision. */
export function formatPointTooltip(point: ChartPoint): string {
  const distance = point.sampleIndex !== undefined;
  return [
    point.seriesName,
    `Shot ${point.shotNumber}${distance ? ` · Sample ${point.sampleIndex! + 1}` : ''}`,
    ...(distance ? [`Distance: ${point.value[0]} (raw)`] : []),
    `Velocity: ${point.value[1]} (raw)`,
    `Unit code: ${point.rawUnit} · unverified`,
  ].join('\n');
}

/** Resolve full distance traces or individual muzzle points for linked highlighting. */
export function findShotTargets(traces: ChartTrace[], shotId: string) {
  return traces.flatMap<{ seriesIndex: number; dataIndex?: number }>((trace, seriesIndex) => {
    if (trace.shotId === shotId && trace.data.length)
      return [{ seriesIndex, dataIndex: undefined }];
    const dataIndex = trace.data.findIndex((point) => point.shotId === shotId);
    return dataIndex < 0 ? [] : [{ seriesIndex, dataIndex }];
  });
}
