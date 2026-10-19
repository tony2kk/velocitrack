/** Accept finite source numbers without coercing missing values or numeric strings. */
export function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Resolve whitelisted nested metadata; never traverse prototypes or evaluate source content. */
export function rawPath(value: unknown, path: string): unknown {
  for (const key of path.split('.')) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}
