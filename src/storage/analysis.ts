import {
  defaultAnalysis,
  defaultProfile,
  type AnalysisMode,
  type ChartSettings,
} from '../domain/model';
import { normalizeChart } from '../domain/analysis';
import { db } from './database';

/** Merge only the edited analysis within a transaction, preserving other tabs' preferences. */
export async function saveAnalysis(mode: AnalysisMode, patch?: Partial<ChartSettings>) {
  await db.transaction('rw', db.profiles, async () => {
    const profile = { ...defaultProfile(), ...(await db.profiles.get('local')) };
    const analysis = { ...defaultAnalysis(), ...profile.analysis };
    // Editing a chart must not undo an analysis-mode choice made concurrently in another tab.
    if (!patch) analysis.mode = mode;
    if (mode !== 'info' && patch) analysis[mode] = normalizeChart({ ...analysis[mode], ...patch });
    await db.profiles.put({ ...profile, analysis });
  });
}
