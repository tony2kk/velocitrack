import type { DisplayScale } from '../chartViewport';
import type { Annotation, FieldDefinition, Series, Shot, Tag, UnitSystem } from '../model';
import type { DragModel } from './velocityCalculation';

/** Canonical X is feet; Y uses the definition's own canonical unit. Null breaks a line. */
export interface DistanceSample {
  readonly distance: number;
  readonly value: number | null;
  readonly sampleIndex?: number;
}

/** Minimal sample input retained for standalone transformations and existing helpers. */
export interface DistanceCurveInput {
  readonly samples: readonly DistanceSample[];
  readonly maxDistance: number;
}

/** Recursively readonly record properties and arrays; unknown raw values still require narrowing. */
export type CurveReadonly<T> = T extends object
  ? { readonly [Key in keyof T]: CurveReadonly<T[Key]> }
  : T;

/** Local records supplied by the caller; the adapter selects and detaches matching entity data. */
export interface DistanceCurveData {
  readonly series: readonly Series[];
  readonly annotations?: readonly Annotation[];
  readonly fields?: readonly FieldDefinition[];
  readonly tags?: readonly Tag[];
}

/** Full per-shot callback context. Imported values and local annotations never overwrite each other. */
export interface DistanceCurveContext extends DistanceCurveInput {
  readonly shot: CurveReadonly<Shot>;
  /** The matching source-scoped Series record (called a string in the product), or null if absent. */
  readonly string: CurveReadonly<Series> | null;
  readonly shotAnnotation: CurveReadonly<Annotation> | null;
  readonly stringAnnotation: CurveReadonly<Annotation> | null;
  readonly fields: readonly CurveReadonly<FieldDefinition>[];
  /** Definitions for tags assigned to either of the two annotations. */
  readonly tags: readonly CurveReadonly<Tag>[];
}

/** A compile-time extension; callbacks are synchronous and must be pure and bounded. */
export interface CustomDistanceCurve {
  /** New IDs use curve:<name>; the two existing calculated IDs remain compatible with saved data. */
  readonly id: `curve:${string}` | 'calculated:g1' | 'calculated:g7';
  readonly label: (units: UnitSystem) => string;
  /** Share a key only when canonical units and physical meaning really agree. */
  readonly axisKey: string;
  readonly displayScale: (units: UnitSystem) => DisplayScale;
  readonly description: string;
  /** Short unit/sign/reference explanation shown with the hovered curve point. */
  readonly tooltipNote?: string;
  readonly unavailableReason?: string;
  readonly usesForecast?: boolean;
  /** Optional legacy model identity for the existing G1/G7 tooltip and coefficient display. */
  readonly model?: DragModel;
  /** Cheap input check; this must not perform the full calculation. */
  readonly available: (input: DistanceCurveContext) => boolean;
  /** Return ascending distinct distances, <=5,000 points, finite Y or null; zero/negative Y are valid. */
  readonly calculate: (input: DistanceCurveContext) => readonly DistanceSample[];
}
