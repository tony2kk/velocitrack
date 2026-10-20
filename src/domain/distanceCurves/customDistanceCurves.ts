import type { CustomDistanceCurve } from './types';
import { calculatedVelocityG1Curve } from './calculatedVelocityG1';
import { calculatedVelocityG7Curve } from './calculatedVelocityG7';

/** Add imported definitions here, in the desired Quantity/Second quantity menu order. */
export const customDistanceCurves: readonly CustomDistanceCurve[] = [
  calculatedVelocityG1Curve,
  calculatedVelocityG7Curve,
];
