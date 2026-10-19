import type { Annotation, Filters, Series } from './model';

/** Parse a real calendar date in local time, optionally including the entire final day. */
function dateBoundary(value: string, endOfDay: boolean): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date.getTime();
}

/** Validate explicit date ranges while allowing either boundary to remain open. */
export function filterDateError(filters: Filters): string | null {
  if (filters.dateMode !== 'range') return null;
  const from = filters.dateFrom ? dateBoundary(filters.dateFrom, false) : null;
  const to = filters.dateTo ? dateBoundary(filters.dateTo, true) : null;
  if ((filters.dateFrom && from === null) || (filters.dateTo && to === null))
    return 'Enter valid dates.';
  return from !== null && to !== null && from > to
    ? 'The start date must be on or before the end date.'
    : null;
}

/** Apply inclusive criteria without mutating the input, then sort newest sessions first. */
export function filterSeries(
  series: Series[],
  filters: Filters,
  now = new Date(),
  annotations: Annotation[] = [],
): Series[] {
  const tags = new Map(annotations.map((item) => [item.entityId, item.tagIds ?? []]));
  if (filterDateError(filters)) return [];
  let from: number | null = null;
  let to: number | null = null;

  if (filters.dateMode === 'range') {
    from = dateBoundary(filters.dateFrom, false);
    to = dateBoundary(filters.dateTo, true);
  } else if (filters.dateMode === 'weeks' || filters.dateMode === 'months') {
    const start = new Date(now);
    const amount = Math.min(120, Math.max(1, Math.trunc(filters.relativeAmount) || 1));
    if (filters.dateMode === 'weeks') {
      start.setDate(start.getDate() - amount * 7);
    } else {
      const day = start.getDate();
      // Clamp month-end dates instead of letting Date roll into the following month.
      start.setDate(1);
      start.setMonth(start.getMonth() - amount);
      const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      start.setDate(Math.min(day, lastDay));
    }
    from = start.getTime();
    to = now.getTime();
  }

  return series
    .filter((item) => {
      if (filters.tagIds?.length && !filters.tagIds.some((id) => tags.get(item.id)?.includes(id)))
        return false;
      if (filters.sourceIds.length && !filters.sourceIds.includes(item.sourceId)) return false;
      if (filters.firearmIds.length && !filters.firearmIds.includes(item.firearmId)) return false;
      if (filters.projectileIds.length && !filters.projectileIds.includes(item.projectileId))
        return false;
      if (from !== null || to !== null) {
        if (!item.startedAt) return false;
        const timestamp = Date.parse(item.startedAt);
        if (!Number.isFinite(timestamp)) return false;
        if (from !== null && timestamp < from) return false;
        if (to !== null && timestamp > to) return false;
      }
      return true;
    })
    .sort(
      (left, right) =>
        (right.startedAt ?? '').localeCompare(left.startedAt ?? '') ||
        left.name.localeCompare(right.name),
    );
}

/** Tell the UI whether clearing filters would change the current criteria. */
export function hasFilters(filters: Filters): boolean {
  return Boolean(
    filters.sourceIds.length ||
    filters.tagIds?.length ||
    filters.firearmIds.length ||
    filters.projectileIds.length ||
    filters.dateMode !== 'all',
  );
}
