import { defaultProfile } from '../domain/model';
import { reportName, validateReportProfiles, type ReportProfile } from '../domain/reportProfiles';
import { db } from './database';

/** Save one template against the latest profile so edits cannot discard other tabs' settings. */
export async function saveReportProfile(report: ReportProfile, database = db): Promise<void> {
  await database.transaction('rw', database.profiles, async () => {
    const profile = { ...defaultProfile(), ...(await database.profiles.get('local')) };
    const saved = { ...structuredClone(report), name: reportName(report.name) };
    const reports = profile.reportProfiles ?? [];
    const next = reports.some((item) => item.id === saved.id)
      ? reports.map((item) => (item.id === saved.id ? saved : item))
      : [...reports, saved];
    validateReportProfiles(next, profile.selectedReportProfileId);
    await database.profiles.put({ ...profile, reportProfiles: next });
  });
}

/** Deleting a selected template returns Tools to Quick report in the same transaction. */
export async function deleteReportProfile(id: string, database = db): Promise<void> {
  await database.transaction('rw', database.profiles, async () => {
    const profile = { ...defaultProfile(), ...(await database.profiles.get('local')) };
    await database.profiles.put({
      ...profile,
      reportProfiles: (profile.reportProfiles ?? []).filter((item) => item.id !== id),
      selectedReportProfileId:
        profile.selectedReportProfileId === id ? undefined : profile.selectedReportProfileId,
    });
  });
}
