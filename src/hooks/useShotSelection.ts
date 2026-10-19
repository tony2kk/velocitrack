import { useCallback, useMemo, useState } from 'react';
import type { Series, Shot } from '../domain/model';

/** Keep only deselection exceptions in page memory so new measurements start selected. */
export function useShotSelection(
  shots: Shot[],
  selectedSeries: Series[],
  invalidShots?: ReadonlySet<string>,
) {
  const [hiddenShots, setHiddenShots] = useState<ReadonlySet<string>>(() => new Set());
  const toggleShot = useCallback((id: string, checked: boolean) => {
    setHiddenShots((current) => {
      const next = new Set(current);
      if (checked) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  /** Apply one bulk change while preserving deselections in strings outside the current table. */
  const toggleShots = useCallback((ids: string[], checked: boolean) => {
    setHiddenShots((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);
  const seriesShots = useMemo(() => {
    const ids = new Set(selectedSeries.map((item) => item.id));
    return shots
      .filter((shot) => ids.has(shot.seriesId))
      .sort(
        (a, b) =>
          a.seriesId.localeCompare(b.seriesId) || a.number - b.number || a.id.localeCompare(b.id),
      );
  }, [shots, selectedSeries]);
  const selectedShots = useMemo(
    () => seriesShots.filter((shot) => !hiddenShots.has(shot.id) && !invalidShots?.has(shot.id)),
    [seriesShots, hiddenShots, invalidShots],
  );
  const resetSelection = useCallback(() => setHiddenShots(new Set()), []);
  return { hiddenShots, seriesShots, selectedShots, toggleShot, toggleShots, resetSelection };
}
