import type { Shot } from './model';

/** Valid plotted pair retaining its original sample index for traceability. */
export interface MeasurementPoint {
  distance: number;
  velocity: number;
  index: number;
}

/** Classify paired samples without changing raw arrays; report unmatched tails separately. */
export function inspectPoints(shot: Pick<Shot, 'distances' | 'velocities'>) {
  const points: MeasurementPoint[] = [];
  let padding = 0;
  let invalid = 0;
  const pairedLength = Math.min(shot.distances.length, shot.velocities.length);

  for (let index = 0; index < pairedLength; index += 1) {
    const distance = shot.distances[index]!;
    const velocity = shot.velocities[index]!;
    if (distance === 0 && velocity === 0) {
      // Only the paired zero sentinel is padding; distance zero with positive velocity is valid.
      padding += 1;
    } else if (
      !Number.isFinite(distance) ||
      !Number.isFinite(velocity) ||
      distance < 0 ||
      velocity <= 0
    ) {
      invalid += 1;
    } else {
      points.push({ distance, velocity, index });
    }
  }

  return {
    points,
    padding,
    invalid,
    unpaired: Math.abs(shot.distances.length - shot.velocities.length),
  };
}

/** Summarize valid, non-excluded muzzle readings only when their source/unit grouping agrees. */
export function summarizeShots(shots: Shot[]) {
  const included = shots.filter(
    (shot) =>
      !shot.excluded &&
      shot.muzzleVelocity !== null &&
      Number.isFinite(shot.muzzleVelocity) &&
      shot.muzzleVelocity > 0,
  );
  // Unknown units are only comparable within the same source and raw unit code.
  const groups = new Set(included.map((shot) => JSON.stringify([shot.sourceId, shot.rawUnit])));
  if (groups.size > 1) {
    return {
      count: included.length,
      mean: null,
      sd: null,
      spread: null,
      minimum: null,
      maximum: null,
      incompatible: true,
    };
  }

  let mean = 0;
  let squaredDeviations = 0;
  let minimum = Infinity;
  let maximum = -Infinity;
  // Welford's running variance avoids cancellation for readings with a small spread.
  included.forEach((shot, index) => {
    const value = shot.muzzleVelocity!;
    const delta = value - mean;
    mean += delta / (index + 1);
    squaredDeviations += delta * (value - mean);
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  });

  return {
    count: included.length,
    mean: included.length ? mean : null,
    // Sample deviation needs at least two readings and uses n - 1, not population variance.
    sd: included.length > 1 ? Math.sqrt(squaredDeviations / (included.length - 1)) : null,
    spread: included.length ? maximum - minimum : null,
    minimum: included.length ? minimum : null,
    maximum: included.length ? maximum : null,
    incompatible: false,
  };
}

/** Prevent mixed source/unit charts; equal raw codes are only a provisional compatibility check. */
export function chartGroupsCompatible(shots: Shot[]): boolean {
  return (
    new Set(
      shots
        .filter((shot) => !shot.excluded)
        .map((shot) => JSON.stringify([shot.sourceId, shot.rawUnit])),
    ).size <= 1
  );
}
