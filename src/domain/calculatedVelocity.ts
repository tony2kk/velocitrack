/**
 * Compatibility exports for existing callers. Implementations now live beside the custom curves.
 * Keep this path while saved integrations and internal consumers migrate independently.
 */
export {
  calculatedVelocity,
  dragCoefficient,
  predictionInputs,
  velocityModel,
  STANDARD_DENSITY,
  STANDARD_SOUND_SPEED,
  DEFAULT_FORECAST_DISTANCE,
  MAX_FORECAST_DISTANCE,
  type DragModel,
} from './distanceCurves/velocityCalculation';
