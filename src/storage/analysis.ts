import {
  defaultAnalysis,
  defaultProfile,
  type AnalysisMode,
  type ChartSettings,
} from '../domain/model';
import { normalizeChart } from '../domain/analysis';
import { db } from './database';

/** Apply edits against the latest stored chart in one transaction, preserving concurrent choices. */
export async function saveAnalysis(
  mode: AnalysisMode,
  patch?: Partial<ChartSettings> | ((current: ChartSettings) => Partial<ChartSettings>),
) {
  await db.transaction('rw', db.profiles, async () => {
    const profile = { ...defaultProfile(), ...(await db.profiles.get('local')) };
    const analysis = { ...defaultAnalysis(), ...profile.analysis };
    // Editing a chart must not undo an analysis-mode choice made concurrently in another tab.
    if (!patch) analysis.mode = mode;
    if (mode !== 'info' && patch) {
      const changes = typeof patch === 'function' ? patch(analysis[mode]) : patch;
      analysis[mode] = normalizeChart({ ...analysis[mode], ...changes }, mode === 'compare');
    }
    await db.profiles.put({ ...profile, analysis });
  });
}
