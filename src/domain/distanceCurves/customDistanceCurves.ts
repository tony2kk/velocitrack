import type { CustomDistanceCurve } from './types';
import { calculatedVelocityG1Curve } from './calculatedVelocityG1';
import { calculatedVelocityG7Curve } from './calculatedVelocityG7';
import { calculatedDropG1Curve } from './calculatedDropG1';
import { calculatedDropG7Curve } from './calculatedDropG7';

/** Ordered list shown in Quantity and Second quantity after built-in curves. */
export const customDistanceCurves: readonly CustomDistanceCurve[] = [
  calculatedVelocityG1Curve,
  calculatedVelocityG7Curve,
  calculatedDropG1Curve,
  calculatedDropG7Curve,
];
