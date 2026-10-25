import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { FieldDefinition, Profile } from '../domain/model';
import {
  MAX_REPORT_PROFILES,
  MAX_REPORT_VIEWS,
  newReportProfile,
  newReportView,
  type ReportProfile,
} from '../domain/reportProfiles';
import { deleteReportProfile, saveReportProfile } from '../storage/reportProfiles';
import { ReportViewList } from './ReportViewList';

/** Manage detached template drafts; saving never changes Quick report or the workspace chart. */
export function ReportBuilder({
  profile,
  fields,
}: {
  profile: Profile;
  fields: FieldDefinition[];
}) {
  const reports = profile.reportProfiles ?? [];
  const [draft, setDraft] = useState<ReportProfile | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  /** Keep a rejected save or deletion visible while retaining the user's draft. */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The report profile could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="report-builder">
      <p className="muted">
        Reusable PDF profiles, saved on this device. Reports use the selected strings and shots,
        profile units and paper size, and current shot-table columns. Each chart fits its data
        automatically.
      </p>
      {!draft ? (
        <>
          <button
            type="button"
            className="primary"
            disabled={reports.length >= MAX_REPORT_PROFILES || busy}
            onClick={() => {
              setError('');
              setDeleting(null);
              setDraft(newReportProfile());
            }}
          >
            <Plus size={16} /> Add report profile
          </button>
          {!reports.length && (
            <p>No report profiles yet. Quick report remains available in Tools.</p>
          )}
          <div className="report-profile-list">
            {reports.map((report) => (
              <div key={report.id} className="report-profile-row">
                <div>
                  <strong>{report.name}</strong>
                  <small>
                    {report.views.length} saved view{report.views.length === 1 ? '' : 's'} ·{' '}
                    {Object.values(report.sections).filter(Boolean).length} sections
                  </small>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy}
                  aria-label={`Edit ${report.name}`}
                  title="Edit this saved report profile."
                  onClick={() => {
                    setError('');
                    setDeleting(null);
                    setDraft(structuredClone(report));
                  }}
                >
                  <Pencil size={17} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy}
                  aria-label={`Delete ${report.name}`}
                  title="Delete this template; measurements and previously saved PDFs are unaffected."
                  onClick={() => setDeleting(report.id)}
                >
                  <Trash2 size={17} />
                </button>
                {deleting === report.id && (
                  <div className="report-delete-confirm">
                    <p>Delete “{report.name}”? This removes only the report profile.</p>
                    <button type="button" disabled={busy} onClick={() => setDeleting(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await deleteReportProfile(report.id);
                          setDeleting(null);
                        })
                      }
                    >
                      Delete profile
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await saveReportProfile(draft);
              setDraft(null);
            });
          }}
        >
          <fieldset disabled={busy}>
            <label className="field">
              Name
              <input
                required
                maxLength={100}
                value={draft.name}
                title="A unique report profile name. Names ignore case and extra spaces."
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                autoFocus
              />
            </label>
            <h3>Sections</h3>
            <div className="report-section-grid">
              {(
                [
                  { id: 'details', label: 'String details' },
                  { id: 'target', label: 'Target' },
                  { id: 'statistics', label: 'String statistics' },
                  { id: 'records', label: 'Shot records' },
                ] as const
              ).map((section) => (
                <label key={section.id} className="check-field">
                  <input
                    type="checkbox"
                    checked={draft.sections[section.id]}
                    title={`Include ${section.label.toLowerCase()} using the same layout as Quick report.`}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        sections: { ...draft.sections, [section.id]: event.target.checked },
                      })
                    }
                  />{' '}
                  {section.label}
                </label>
              ))}
            </div>
            <h3>Charts &amp; string info</h3>
            <p className="muted">
              Add any views you need, then drag their handles or use the arrows to set the order. A
              profile may contain no charts.
            </p>
            <ReportViewList
              views={draft.views}
              fields={fields}
              units={profile.unitSystem}
              onChange={(views) => setDraft({ ...draft, views })}
            />
            <button
              type="button"
              disabled={draft.views.length >= MAX_REPORT_VIEWS}
              onClick={() => setDraft({ ...draft, views: [...draft.views, newReportView()] })}
            >
              <Plus size={16} /> Add view
            </button>
          </fieldset>
          <footer className="dialog-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError('');
                setDraft(null);
              }}
            >
              Cancel
            </button>
            <button className="primary" disabled={busy}>
              Save report profile
            </button>
          </footer>
        </form>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
