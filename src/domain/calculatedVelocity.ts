import type { Shot } from './model';
import { DRAG_TABLES } from './dragTables';

/** A coefficient is meaningful only with its own reference drag family. */
export type DragModel = 'g1' | 'g7';
export const STANDARD_DENSITY = 1.225;
export const STANDARD_SOUND_SPEED = 340.294;
export const DEFAULT_FORECAST_DISTANCE = 1000; // ft; display conversion never changes stored preference.
export const MAX_FORECAST_DISTANCE = 1000 / 0.3048; // 1 km, a bounded display horizon, not a validated accuracy range.
// Conventional G-model BC uses lb/in²; convert it to kg/m² before applying the drag equation.
const BC_TO_SI = 0.45359237 / 0.0254 ** 2;

/** Linear interpolation of reference Cd, rejecting velocities outside the published Mach domain. */
export function dragCoefficient(model: DragModel, mach: number): number | null {
  const table = DRAG_TABLES[model];
  if (!Number.isFinite(mach) || mach < 0 || mach > table.at(-1)![0]) return null;
  let left = 0,
    right = table.length - 1;
  while (right - left > 1) {
    const middle = (left + right) >>> 1;
    if (table[middle]![0] <= mach) left = middle;
    else right = middle;
  }
  const [x0, y0] = table[left]!,
    [x1, y1] = table[right]!;
  return y0 + ((y1 - y0) * (mach - x0)) / (x1 - x0);
}

/** Both models require their own positive source BC and muzzle velocity, not downrange sample pairs. */
export function predictionInputs(
  shot: Partial<Shot>,
  model: DragModel,
): { velocity: number; bc: number } | null {
  const velocity = (shot.muzzleVelocity ?? 0) * 0.3048;
  const bc = model === 'g1' ? shot.ballisticCoefficientG1 : shot.ballisticCoefficientG7;
  return Number.isFinite(velocity) &&
    velocity > 0 &&
    velocity <= 5 * STANDARD_SOUND_SPEED &&
    typeof bc === 'number' &&
    Number.isFinite(bc) &&
    bc >= 0.01 &&
    bc <= 5
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
  shot: Partial<Shot>,
  model: DragModel,
  distanceFeet = DEFAULT_FORECAST_DISTANCE,
): { distance: number; velocity: number }[] {
  const input = predictionInputs(shot, model);
  if (
    !input ||
    !Number.isFinite(distanceFeet) ||
    distanceFeet <= 0 ||
    distanceFeet > MAX_FORECAST_DISTANCE
  )
    return [];
  const end = distanceFeet * 0.3048;
  const factor = (STANDARD_DENSITY * Math.PI) / (8 * input.bc * BC_TO_SI);
  /** Evaluate drag in logarithmic speed space so integration cannot create negative speeds. */
  function derivative(logSpeed: number): number {
    // Validated speed only decreases; clamp roundoff at exactly Mach 5, never unsupported inputs.
    return (
      -factor * dragCoefficient(model, Math.min(5, Math.exp(logSpeed) / STANDARD_SOUND_SPEED))!
    );
  }
  let logSpeed = Math.log(input.velocity),
    distance = 0,
    steps = 0;
  const result = [{ distance: 0, velocity: input.velocity / 0.3048 }];
  for (let index = 1; index <= 200; index++) {
    const target = (end * index) / 200;
    while (distance < target) {
      if (++steps > 10000) return result;
      const k1 = derivative(logSpeed);
      const step = Math.min(target - distance, 1, 0.02 / Math.abs(k1));
      const k2 = derivative(logSpeed + (step * k1) / 2);
      const k3 = derivative(logSpeed + (step * k2) / 2);
      const k4 = derivative(logSpeed + step * k3);
      logSpeed += (step * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
      distance += step;
    }
    const velocity = Math.exp(logSpeed) / 0.3048;
    if (!Number.isFinite(velocity) || velocity <= 1e-6) return result;
    result.push({ distance: target / 0.3048, velocity });
  }
  return result;
}

/** Resolve only explicitly supported model quantities; recorded Velocity remains a separate choice. */
export function velocityModel(quantity: string): DragModel | null {
  return quantity === 'calculated:g1' ? 'g1' : quantity === 'calculated:g7' ? 'g7' : null;
}
