import type { CustomDistanceCurve } from '../../src/domain/distanceCurves/types';

/** Invented metadata-only extension used to exercise every chart data path without a model. */
export const contextCurve: CustomDistanceCurve = {
  id: 'curve:string-review-score',
  label: () => 'String review score',
  axisKey: 'review-score',
  displayScale: () => ({ factor: 1, offset: 0 }),
  description: 'Synthetic review metadata at recorded sample positions.',
  available: (input) =>
    input.shot.raw.reviewed === true &&
    input.string?.raw.sampleGroup === 'enabled' &&
    typeof input.stringAnnotation?.values?.score === 'number' &&
    input.fields.some((field) => field.id === 'score'),
  calculate: (input) => [
    { distance: 0, value: Number(input.stringAnnotation?.values?.score) },
    { distance: 10, value: Number(input.stringAnnotation?.values?.score) },
  ],
};
