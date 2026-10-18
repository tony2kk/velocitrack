/** Counts describe newly added identities, never all downloaded records or updates to existing ones. */
export interface ImportCounts {
  series: number;
  shots: number;
}

/** Keep file, sign-in and refresh notifications consistent, including zero-new-record imports. */
export function importMessage(name: string, counts: ImportCounts): string {
  const parts: string[] = [];
  if (counts.series) parts.push(`${counts.series} new series`);
  if (counts.shots) parts.push(`${counts.shots} new shot${counts.shots === 1 ? '' : 's'}`);
  return `${name}: ${parts.length ? `${parts.join(' and ')} imported.` : 'No new data detected.'}`;
}
