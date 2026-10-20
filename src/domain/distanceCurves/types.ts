import type { DisplayScale } from '../chartViewport';
import type { UnitSystem } from '../model';

/** Canonical X is feet; Y uses the definition's own canonical unit. Null breaks a line. */
export interface DistanceSample {
  readonly distance: number;
  readonly value: number | null;
  readonly sampleIndex?: number;
}

/** Detached, frozen measured samples in ft and ft/s, plus the requested horizon in ft. */
export interface DistanceCurveInput {
  readonly samples: readonly DistanceSample[];
  readonly maxDistance: number;
}

/** A compile-time extension; callbacks are synchronous and must be pure and bounded. */
export interface CustomDistanceCurve {
  /** Stable persisted identity; custom IDs use curve:<name>. */
  readonly id: `curve:${string}`;
  readonly label: (units: UnitSystem) => string;
  /** Share a key only when canonical units and physical meaning really agree. */
  readonly axisKey: string;
  readonly displayScale: (units: UnitSystem) => DisplayScale;
  readonly description: string;
  readonly unavailableReason?: string;
  readonly usesForecast?: boolean;
  /** Cheap input check; this must not perform the full calculation. */
  readonly available: (input: DistanceCurveInput) => boolean;
  /** Return ascending distinct distances, <=5,000 points, finite Y or null; zero/negative Y are valid. */
  readonly calculate: (input: DistanceCurveInput) => readonly DistanceSample[];
}
