import type { Shot } from '../model';
import { inspectPoints } from '../measurements';
import type { DistanceCurveContext, DistanceCurveData } from './types';

/** Detach the full local records before freezing; never freeze objects owned by the workspace. */
export function createDistanceCurveContext(
  shot: Shot,
  maxDistance: number,
  data?: DistanceCurveData,
): DistanceCurveContext {
  // Match both identities even if a caller supplies malformed or stale workspace rows.
  const string = data?.series.find(
    (item) => item.id === shot.seriesId && item.sourceId === shot.sourceId,
  );
  const shotAnnotation = data?.annotations?.find((item) => item.entityId === shot.id) ?? null;
  const stringAnnotation =
    (string && data?.annotations?.find((item) => item.entityId === string.id)) ?? null;
  const tagIds = new Set([...(shotAnnotation?.tagIds ?? []), ...(stringAnnotation?.tagIds ?? [])]);
  const context: DistanceCurveContext = structuredClone({
    shot,
    string: string ?? null,
    shotAnnotation,
    stringAnnotation,
    fields: data?.fields ?? [],
    tags: data?.tags?.filter((tag) => tagIds.has(tag.id)) ?? [],
    samples: inspectPoints(shot).points.map((point) => ({
      distance: point.distance,
      value: point.velocity,
      sampleIndex: point.index,
    })),
    maxDistance,
  });
  // Iteration tolerates deeply nested/cyclic cloneable metadata without recursive stack growth.
  const pending: object[] = [context];
  const seen = new WeakSet<object>();
  while (pending.length) {
    const value = pending.pop()!;
    if (seen.has(value)) continue;
    seen.add(value);
    for (const child of Object.values(value))
      if (child !== null && typeof child === 'object') pending.push(child);
    Object.freeze(value);
  }
  return context;
}
