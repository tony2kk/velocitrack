/** Accept finite source numbers without coercing missing values or numeric strings. */
export function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Normalize supported provider timestamps to milliseconds for both display and chronological sorting. */
export function providerTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (value && typeof value === 'object') {
    const seconds = rawPath(value, 'seconds');
    return finiteNumber(seconds) ? seconds * 1000 : null;
  }
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)
        ? Number(value)
        : null;
  const time =
    numeric === null
      ? Date.parse(String(value))
      : numeric < 100_000_000_000
        ? numeric * 1000
        : numeric;
  return Number.isFinite(time) ? time : null;
}

/** Resolve whitelisted nested metadata; never traverse prototypes or evaluate source content. */
export function rawPath(value: unknown, path: string): unknown {
  for (const key of path.split('.')) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}
