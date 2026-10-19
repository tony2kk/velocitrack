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
export { finiteNumber, rawPath } from './providerData';

export const QUANTITIES: ChartQuantity[] = ['velocity', 'g1', 'g7'];

/** A plotted scalar declares its display unit and reads a value without mutating provider records. */
export interface Quantity {
  id: string;
  label: string;
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
    read: (shot) => {
      const value = shotQuantity(shot, id);
      return value === null ? null : quantityDisplay(value, id, units);
    },
  }));
  definitions.push({
    id: 'projectileWeight',
    label: `Projectile weight (${units === 'metric' ? 'g' : 'grs'})`,
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

/** Distance samples contain velocity only; coefficients are recorded once per shot. */
export function axisQuantities(axis: ChartSettings['axis']): ChartQuantity[] {
  return axis === 'distance' ? ['velocity'] : QUANTITIES;
}

/** Changing axes fixes structurally invalid choices, independently of temporary missing data. */
export function normalizeChart(settings: ChartSettings): ChartSettings {
  const available = axisQuantities(settings.axis);
  const quantity =
    settings.axis === 'shot' || available.includes(settings.quantity)
      ? settings.quantity
      : available[0]!;
  const secondary =
    (settings.axis === 'shot' || available.includes(settings.secondary)) &&
    settings.secondary !== quantity
      ? settings.secondary
      : (available.find((item) => item !== quantity) ?? quantity);
  return { ...settings, quantity, secondary };
}

/** Label units only for physical quantities; G1/G7 remain dimensionless. */
export function quantityLabel(quantity: ChartQuantity, units: UnitSystem): string {
  return quantity === 'velocity'
    ? `Velocity (${unitLabels[units].velocity})`
    : quantity === 'g1' || quantity === 'g7'
      ? `${quantity.toUpperCase()} (Caldwell)`
      : quantity;
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
