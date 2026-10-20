import type {
  Annotation,
  FieldDefinition,
  ChartQuantity,
  ChartSettings,
  Series,
  Shot,
  UnitSystem,
} from './model';
import { displayValue, unitLabels } from './units';
import { fieldUnit, fieldFactor } from './customFields';
import { projectileWeight } from './projectiles';
import { finiteNumber, rawPath } from './providerData';
import { distanceCurveRegistry, supportsDistanceCurve } from './distanceCurves/registry';
import type { DisplayScale } from './chartViewport';
import type { DistanceCurveData } from './distanceCurves/types';
import { TARGET_FIELDS, TARGET_LABELS, targetUnit } from './targetMeasurement';
export { finiteNumber, rawPath } from './providerData';

export const QUANTITIES: ChartQuantity[] = ['velocity', 'g1', 'g7'];

/** A plotted scalar declares its display unit and reads a value without mutating provider records. */
export interface Quantity {
  id: string;
  label: string;
  /** The view uses this transform to preserve physical axis ranges across unit changes. */
  displayScale?: DisplayScale;
  read: (shot: Partial<Shot> & Pick<Shot, 'seriesId'>) => number | null;
}

/** Build available scalar definitions, keeping unknown provider units explicit rather than guessing. */
export function availableQuantities(
  shots: (Partial<Shot> & Pick<Shot, 'seriesId'>)[],
  series: Series[],
  fields: FieldDefinition[],
  annotations: Annotation[],
  units: UnitSystem,
  includeUnavailable = false,
): Quantity[] {
  const sessions = new Map(series.map((item) => [item.id, item]));
  const details = new Map(annotations.map((item) => [item.entityId, item]));
  const definitions: Quantity[] = QUANTITIES.map((id) => ({
    id,
    label: quantityLabel(id, units),
    displayScale: { factor: id === 'velocity' && units === 'metric' ? 0.3048 : 1, offset: 0 },
    read: (shot) => {
      const value = shotQuantity(shot, id);
      return value === null ? null : quantityDisplay(value, id, units);
    },
  }));
  for (const field of TARGET_FIELDS) {
    const unit = targetUnit(units);
    definitions.push({
      id: `target:${field}`,
      label: `String ${TARGET_LABELS[field].toLowerCase()} (${unit.label})`,
      displayScale: { factor: 1 / unit.mm, offset: 0 },
      read: (shot) => {
        const value = details.get(shot.seriesId)?.target?.values[field];
        return typeof value === 'number' && Number.isFinite(value) ? value / unit.mm : null;
      },
    });
  }
  definitions.push({
    id: 'projectileWeight',
    label: `Projectile weight (${units === 'metric' ? 'g' : 'grs'})`,
    displayScale: { factor: units === 'metric' ? 0.06479891 : 1, offset: 0 },
    read: (shot) => {
      const session = sessions.get(shot.seriesId);
      const weight = session ? projectileWeight(session) : null;
      return weight?.grains === null || !weight
        ? null
        : weight.grains * (units === 'metric' ? 0.06479891 : 1);
    },
  });
  const sourceFields = [
    ['altitude', 'Altitude', false],
    ['distanceToChronograph', 'Distance to chronograph', false],
    ['projectile.diameter', 'Projectile diameter', false],
    ...[
      'temperature',
      'temperatureMin',
      'temperatureMax',
      'feelsLikeTemperature',
      'humidity',
      'pressure',
      'windSpeed',
      'windGust',
      'windDegrees',
      'visibility',
    ].map((key) => [
      `weatherData.${key}`,
      key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
      key.toLowerCase().includes('temperature'),
    ]),
  ] as [string, string, boolean][];
  for (const [path, name, temperature] of sourceFields)
    definitions.push({
      id: `source:${path}`,
      label: `${name} (${temperature ? unitLabels[units].temperature : path.endsWith('humidity') ? '%' : path.endsWith('windDegrees') ? '°' : 'source units'})`,
      displayScale:
        temperature && units === 'metric'
          ? { factor: 5 / 9, offset: (-32 * 5) / 9 }
          : { factor: 1, offset: 0 },
      read: (shot) => {
        const value = rawPath(sessions.get(shot.seriesId)?.raw, path);
        return finiteNumber(value)
          ? temperature
            ? displayValue(value, 'temperature', units)
            : value
          : null;
      },
    });
  for (const key of [
    'minimum',
    'maximum',
    'average',
    'muzzleVelocity',
    'standardDeviation',
    'spread',
    'totalShots',
    'ballisticCoefficientG1',
    'ballisticCoefficientG7',
  ])
    definitions.push({
      id: `source:statistics.${key}`,
      label: `String ${key.replace(/([A-Z])/g, ' $1')} (Caldwell${['minimum', 'maximum', 'average', 'muzzleVelocity', 'standardDeviation', 'spread'].includes(key) ? `, ${unitLabels[units].velocity}` : ''})`,
      displayScale: {
        factor:
          units === 'metric' &&
          [
            'minimum',
            'maximum',
            'average',
            'muzzleVelocity',
            'standardDeviation',
            'spread',
          ].includes(key)
            ? 0.3048
            : 1,
        offset: 0,
      },
      read: (shot) => {
        const value = rawPath(sessions.get(shot.seriesId)?.raw, `statistics.${key}`);
        return finiteNumber(value)
          ? [
              'minimum',
              'maximum',
              'average',
              'muzzleVelocity',
              'standardDeviation',
              'spread',
            ].includes(key)
            ? quantityDisplay(value, 'velocity', units)
            : value
          : null;
      },
    });
  for (const field of fields.filter((field) => !['short-text', 'note'].includes(field.type)))
    definitions.push({
      id: `field:${field.id}`,
      displayScale: { factor: fieldFactor(field.type, units), offset: 0 },
      label:
        field.name + (fieldUnit(field.type, units) ? ` (${fieldUnit(field.type, units)})` : ''),
      read: (shot) => {
        const value = details.get(shot.seriesId)?.values?.[field.id];
        return finiteNumber(value) ? value * fieldFactor(field.type, units) : null;
      },
    });
  return includeUnavailable
    ? definitions
    : definitions.filter((definition) =>
        shots.some((shot) => !shot.excluded && definition.read(shot) !== null),
      );
}

/** A shot scalar is usable only when finite and positive; missing values never become zero. */
export function shotQuantity(shot: Partial<Shot>, quantity: ChartQuantity): number | null {
  const value =
    quantity === 'velocity'
      ? shot.muzzleVelocity
      : quantity === 'g1'
        ? shot.ballisticCoefficientG1
        : shot.ballisticCoefficientG7;
  return value !== null && value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : null;
}

/** Distance supports recorded/model velocity; coefficient scalars remain per-shot quantities. */
export function axisQuantities(axis: ChartSettings['axis']): ChartQuantity[] {
  return axis === 'distance'
    ? distanceCurveRegistry.definitions.map((curve) => curve.id)
    : QUANTITIES;
}

/** Offer only distance quantities supported by selected measurements or valid model inputs. */
export function distanceQuantities(
  shots: Shot[],
  units: UnitSystem,
  data?: DistanceCurveData,
): { id: string; label: string }[] {
  return distanceCurveRegistry.definitions
    .filter((curve) => shots.some((shot) => supportsDistanceCurve(curve, shot, data)))
    .map((curve) => ({ id: curve.id, label: curve.label(units) }));
}

/** Changing axes fixes structurally invalid choices, independently of temporary missing data. */
export function normalizeChart(settings: ChartSettings): ChartSettings {
  const available = axisQuantities(settings.axis);
  const quantity =
    (settings.axis === 'shot' && !isDistanceOnly(settings.quantity)) ||
    available.includes(settings.quantity)
      ? settings.quantity
      : available[0]!;
  const secondary =
    ((settings.axis === 'shot' && !isDistanceOnly(settings.secondary)) ||
      available.includes(settings.secondary)) &&
    settings.secondary !== quantity
      ? settings.secondary
      : settings.axis === 'distance'
        ? quantity
        : (available.find((item) => item !== quantity) ?? quantity);
  return { ...settings, quantity, secondary };
}

/** Label units only for physical quantities; G1/G7 remain dimensionless. */
export function quantityLabel(quantity: ChartQuantity, units: UnitSystem): string {
  const curve = distanceCurveRegistry.get(quantity);
  if (curve) return curve.label(units);
  return quantity === 'velocity'
    ? `Velocity (${unitLabels[units].velocity})`
    : quantity === 'g1' || quantity === 'g7'
      ? `${quantity.toUpperCase()} (Caldwell)`
      : quantity;
}

/** Removed curve IDs remain recognizable when switching an old saved choice back to By shot. */
function isDistanceOnly(quantity: string): boolean {
  return (
    quantity !== 'velocity' &&
    (!!distanceCurveRegistry.get(quantity) ||
      quantity.startsWith('curve:') ||
      quantity.startsWith('calculated:'))
  );
}

/** Apply profile conversion only to velocity, never to coefficients. */
export function quantityDisplay(value: number, quantity: ChartQuantity, units: UnitSystem): number {
  return quantity === 'velocity' ? displayValue(value, 'velocity', units)! : value;
}

/** Keep a stable, contiguous series/shot sequence without comparing unvalidated provider timestamps. */
export function orderedShots(shots: Shot[], series: Series[]): Shot[] {
  const order = new Map(
    [...series]
      .sort(
        (a, b) => (a.startedAt ?? '').localeCompare(b.startedAt ?? '') || a.id.localeCompare(b.id),
      )
      .map((item, index) => [item.id, index]),
  );
  return [...shots].sort(
    (a, b) =>
      (order.get(a.seriesId) ?? 0) - (order.get(b.seriesId) ?? 0) ||
      a.number - b.number ||
      a.id.localeCompare(b.id),
  );
}
