import { useCallback, useMemo, useState } from 'react';
import type { Series, Shot } from '../domain/model';

/** Keep only deselection exceptions in page memory so new measurements start selected. */
export function useShotSelection(shots: Shot[], selectedSeries: Series[]) {
  const [hiddenShots, setHiddenShots] = useState<ReadonlySet<string>>(() => new Set());
  const toggleShot = useCallback((id: string, checked: boolean) => {
    setHiddenShots((current) => {
      const next = new Set(current);
      if (checked) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const selectedShots = useMemo(() => {
    const ids = new Set(selectedSeries.map((item) => item.id));
    return shots
      .filter((shot) => ids.has(shot.seriesId) && !hiddenShots.has(shot.id))
      .sort(
        (a, b) =>
          a.seriesId.localeCompare(b.seriesId) || a.number - b.number || a.id.localeCompare(b.id),
      );
  }, [shots, selectedSeries, hiddenShots]);
  return { hiddenShots, selectedShots, toggleShot };
}
