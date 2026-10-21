import type { CustomDistanceCurve } from './types';
import { calculatedVelocityG1Curve } from './calculatedVelocityG1';
import { calculatedVelocityG7Curve } from './calculatedVelocityG7';
import { calculatedVelocityG1LocalCurve } from './calculatedVelocityG1Local';
import { calculatedVelocityG7LocalCurve } from './calculatedVelocityG7Local';
import { calculatedDropG1Curve } from './calculatedDropG1';
import { calculatedDropG7Curve } from './calculatedDropG7';

/** Ordered list shown in Quantity and Second quantity after built-in curves. */
export const customDistanceCurves: readonly CustomDistanceCurve[] = [
  calculatedVelocityG1Curve,
  calculatedVelocityG7Curve,
  calculatedVelocityG1LocalCurve,
  calculatedVelocityG7LocalCurve,
  calculatedDropG1Curve,
  calculatedDropG7Curve,
];
