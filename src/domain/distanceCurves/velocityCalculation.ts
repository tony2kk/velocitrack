/* eslint-disable prefer-const -- Owner-requested leading declarations keep guard/search-dependent assignments later. */
import type { Shot } from '../model';
import { DRAG_TABLES } from '../dragTables';

/** A coefficient is meaningful only with its own reference drag family. */
export type DragModel = 'g1' | 'g7';
/** Existing reference density in kg/m³; retained unchanged by the catalog refactor. */
export const STANDARD_DENSITY = 1.225;
/** Existing reference sound speed in m/s; retained unchanged by the catalog refactor. */
export const STANDARD_SOUND_SPEED = 340.294;
export const DEFAULT_FORECAST_DISTANCE = 1000; // ft; display conversion never changes stored preference.
export const MAX_FORECAST_DISTANCE = 1000 / 0.3048; // 1 km, a bounded display horizon, not a validated accuracy range.
/** Only these readonly scalar properties are consumed; the full callback context stays detached. */
type VelocityInput = Readonly<
  Partial<Pick<Shot, 'muzzleVelocity' | 'ballisticCoefficientG1' | 'ballisticCoefficientG7'>>
>;

/** Linear interpolation of reference Cd, rejecting velocities outside the published Mach domain. */
export function dragCoefficient(model: DragModel, mach: number): number | null {
  // Reference data and search/interpolation variables. Indexes are dimensionless.
  const table = DRAG_TABLES[model];
  let left = 0; // Lower bracketing row.
  let right = table.length - 1; // Upper bracketing row.
  let middle: number; // Current binary-search row.
  let lowerMach: number; // Lower row's reference coordinate.
  let lowerDrag: number; // Lower row's reference coefficient.
  let upperMach: number; // Upper row's reference coordinate.
  let upperDrag: number; // Upper row's reference coefficient.

  if (!Number.isFinite(mach) || mach < 0 || mach > table.at(-1)![0]) return null;
  while (right - left > 1) {
    middle = (left + right) >>> 1;
    if (table[middle]![0] <= mach) left = middle;
    else right = middle;
  }
  [lowerMach, lowerDrag] = table[left]!;
  [upperMach, upperDrag] = table[right]!;
  return lowerDrag + ((upperDrag - lowerDrag) * (mach - lowerMach)) / (upperMach - lowerMach);
}

/** Both models require their own positive source BC and muzzle velocity, not downrange sample pairs. */
export function predictionInputs(
  shot: VelocityInput,
  model: DragModel,
): { velocity: number; bc: number } | null {
  // Existing conversion and accepted-input bounds; moving declarations does not change these limits.
  const feetToMeters = 0.3048; // Stored input speed to the existing internal unit.
  const maximumMach = 5; // Existing reference-domain input ceiling.
  const minimumCoefficient = 0.01; // Existing accepted coefficient lower bound.
  const maximumCoefficient = 5; // Existing accepted coefficient upper bound.
  const soundSpeed = STANDARD_SOUND_SPEED; // m/s.
  const velocity = (shot.muzzleVelocity ?? 0) * feetToMeters; // m/s.
  const bc = model === 'g1' ? shot.ballisticCoefficientG1 : shot.ballisticCoefficientG7;

  return Number.isFinite(velocity) &&
    velocity > 0 &&
    velocity <= maximumMach * soundSpeed &&
    typeof bc === 'number' &&
    Number.isFinite(bc) &&
    bc >= minimumCoefficient &&
    bc <= maximumCoefficient
    ? { velocity, bc }
    : null;
}

/**
 * Predict still-air, straight-path speed from the muzzle under explicit standard atmosphere.
 * Integrate log(v) with RK4: d(log v)/dx = -rho*pi*Cd(v/a)/(8*BC_SI).
 * Internal steps are <=1 m and <=0.02 estimated log-speed change; output has at most 201 points.
 * This is a constant-BC drag-only estimate, not an atmospheric/trajectory reconstruction or accuracy claim.
 */
export function calculatedVelocity(
  shot: VelocityInput,
  model: DragModel,
  distanceFeet = DEFAULT_FORECAST_DISTANCE,
): { distance: number; velocity: number }[] {
  // Existing constants, conversion factors and work limits; numerical values are unchanged.
  const feetToMeters = 0.3048; // Stored distance/speed to the existing internal units.
  const coefficientToSI = 0.45359237 / 0.0254 ** 2; // Conventional lb/in² to kg/m².
  const density = STANDARD_DENSITY; // kg/m³.
  const soundSpeed = STANDARD_SOUND_SPEED; // m/s.
  const maximumDistance = MAX_FORECAST_DISTANCE; // ft.
  const outputIntervals = 200; // Existing evenly spaced output interval count.
  const maximumSteps = 10000; // Existing bound on internal work.
  const maximumStep = 1; // m.
  const maximumLogChange = 0.02; // Existing step-size bound in logarithmic speed space.
  const minimumOutputVelocity = 1e-6; // ft/s; existing termination threshold.
  const input = predictionInputs(shot, model);
  const result: { distance: number; velocity: number }[] = []; // ft and ft/s.

  // Working variables are assigned only after validation, or at the start of each existing step.
  let end: number; // Requested endpoint in m.
  let factor: number; // Existing drag multiplier.
  let logSpeed: number; // Logarithm of speed in m/s.
  let distance = 0; // Current position in m.
  let steps = 0; // Total internal work count.
  let index: number; // Output position index.
  let target: number; // Current output position in m.
  let step: number; // Current integration step in m.
  let k1: number; // First existing RK4 derivative sample.
  let k2: number; // Second existing RK4 derivative sample.
  let k3: number; // Third existing RK4 derivative sample.
  let k4: number; // Fourth existing RK4 derivative sample.
  let velocity: number; // Current output speed in ft/s.

  /** Evaluate the existing derivative without changing its reference-domain roundoff clamp. */
  function derivative(currentLogSpeed: number): number {
    const maximumMach = 5; // Existing upper reference-table bound.
    const mach = Math.min(maximumMach, Math.exp(currentLogSpeed) / soundSpeed);

    return -factor * dragCoefficient(model, mach)!;
  }

  if (
    !input ||
    !Number.isFinite(distanceFeet) ||
    distanceFeet <= 0 ||
    distanceFeet > maximumDistance
  )
    return [];
  end = distanceFeet * feetToMeters;
  factor = (density * Math.PI) / (8 * input.bc * coefficientToSI);
  logSpeed = Math.log(input.velocity);
  result.push({ distance: 0, velocity: input.velocity / feetToMeters });
  for (index = 1; index <= outputIntervals; index++) {
    target = (end * index) / outputIntervals;
    while (distance < target) {
      if (++steps > maximumSteps) return result;
      k1 = derivative(logSpeed);
      step = Math.min(target - distance, maximumStep, maximumLogChange / Math.abs(k1));
      k2 = derivative(logSpeed + (step * k1) / 2);
      k3 = derivative(logSpeed + (step * k2) / 2);
      k4 = derivative(logSpeed + step * k3);
      logSpeed += (step * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
      distance += step;
    }
    velocity = Math.exp(logSpeed) / feetToMeters;
    if (!Number.isFinite(velocity) || velocity <= minimumOutputVelocity) return result;
    result.push({ distance: target / feetToMeters, velocity });
  }
  return result;
}

/** Resolve only explicitly supported model quantities; recorded Velocity remains a separate choice. */
export function velocityModel(quantity: string): DragModel | null {
  return quantity === 'calculated:g1' ? 'g1' : quantity === 'calculated:g7' ? 'g7' : null;
}
