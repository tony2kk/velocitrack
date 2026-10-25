import { useState } from 'react';
import type { DataSource, Profile, FieldDefinition, Tag } from '../domain/model';
import { CustomizationManager } from './CustomizationManager';
import { saveProfile } from '../storage/workspace';
import { Modal } from './Modal';
import { ReportPreferences } from './ReportPreferences';

/** Edit the browser profile and apply explicit consent changes to existing SDK sessions. */
export function ProfileDialog({
  profile,
  sources,
  refreshing,
  onClose,
  fields = [],
  tags = [],
}: {
  profile: Profile;
  sources: DataSource[];
  refreshing: boolean;
  onClose: () => void;
  fields?: FieldDefinition[];
  tags?: Tag[];
}) {
  const [tab, setTab] = useState<'general' | 'display' | 'report' | 'fields' | 'tags'>('general');
  const [theme, setTheme] = useState(profile.theme ?? 'auto');
  const [showProjectileWeight, setShowProjectileWeight] = useState(
    profile.showProjectileWeight ?? false,
  );
  const [nickname, setNickname] = useState(profile.nickname);
  const [showGroupSize, setShowGroupSize] = useState(profile.showGroupSize ?? false);
  const [showCaldwellNotes, setShowCaldwellNotes] = useState(profile.showCaldwellNotes ?? true);
  const [chartHeightPercent, setChartHeightPercent] = useState(profile.chartHeightPercent ?? 100);
  const [remember, setRemember] = useState(profile.rememberSignIn);
  const [refresh, setRefresh] = useState(profile.refreshOnStart);
  const [unitSystem, setUnitSystem] = useState(profile.unitSystem ?? 'imperial');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Your local profile" onClose={onClose} wide>
      <div className="segmented profile-tabs" aria-label="Profile sections">
        {(['general', 'display', 'report', 'fields', 'tags'] as const).map((value) => (
          <button
            key={value}
            title={`Open ${value} preferences stored in this browser.`}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {value === 'general'
              ? 'General'
              : value === 'display'
                ? 'Display'
                : value === 'report'
                  ? 'Report'
                  : value === 'fields'
                    ? 'Custom fields'
                    : 'Tags'}
          </button>
        ))}
      </div>
      {(tab === 'fields' || tab === 'tags') && (
        <CustomizationManager key={tab} kind={tab} fields={fields} tags={tags} />
      )}
      {tab === 'report' && (
        <ReportPreferences
          initial={profile.report}
          initialPaperSize={profile.reportPaperSize}
          onClose={onClose}
        />
      )}
      {tab === 'display' && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            try {
              await saveProfile({
                theme,
                showProjectileWeight,
                showGroupSize,
                showCaldwellNotes,
                chartHeightPercent,
              });
              onClose();
            } catch {
              setError('Display preferences could not be saved.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="check-field">
            <input
              type="checkbox"
              checked={showProjectileWeight}
              onChange={(event) => setShowProjectileWeight(event.target.checked)}
            />
            <span>
              Projectile weight
              <small>
                Append the original Caldwell weight and unit to projectile names, for example 150
                grs or 2 g.
              </small>
            </span>
          </label>
          <label className="field">
            Theme
            <select
              value={theme}
              title="Use a light or dark appearance, or follow the operating system."
              onChange={(event) => setTheme(event.target.value as typeof theme)}
            >
              <option value="auto">Auto — follow system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={showGroupSize}
              title="Show each string's saved group size in cm or inches. Strings without a value stay blank."
              onChange={(event) => setShowGroupSize(event.target.checked)}
            />
            <span>
              Show group size on string cards
              <small>
                Use the profile's units. Only strings with a saved value display a group size.
              </small>
            </span>
          </label>
          <label className="field">
            Chart height (%)
            <input
              type="number"
              min={70}
              max={200}
              step={1}
              required
              value={Number.isNaN(chartHeightPercent) ? '' : chartHeightPercent}
              title="Set chart height from 70% to 200%. 100% is the default. PDF charts fit their page independently."
              onChange={(event) => setChartHeightPercent(event.target.valueAsNumber)}
            />
            <small>70–200%; 100% uses the default height for this screen.</small>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={showCaldwellNotes}
              title="Show the original Caldwell string note on its card. Empty notes remain hidden."
              onChange={(event) => setShowCaldwellNotes(event.target.checked)}
            />
            <span>
              Show Caldwell string notes on cards
              <small>Enabled by default. Imported notes stay separate from local notes.</small>
            </span>
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer className="dialog-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary" disabled={busy}>
              Save display
            </button>
          </footer>
        </form>
      )}
      <div hidden={tab !== 'general'}>
        <p className="muted">
          This profile belongs to this browser. No account or server is involved.
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              if (remember !== profile.rememberSignIn) {
                const { changeSessionPersistence } = await import('../sources/caldwell/session');
                // Record opt-in before persisting sessions; on opt-out, migrate sessions before saving false.
                if (remember) await saveProfile({ rememberSignIn: true });
                try {
                  await changeSessionPersistence(sources, profile.rememberSignIn, remember);
                } catch (error) {
                  if (remember) {
                    // A partial migration must not leave remembered sessions after a failed opt-in.
                    await changeSessionPersistence(sources, true, false);
                    await saveProfile({ rememberSignIn: false });
                  }
                  throw error;
                }
              }
              await saveProfile({
                nickname: nickname.trim(),
                rememberSignIn: remember,
                refreshOnStart: refresh,
                unitSystem,
              });
              onClose();
            } catch {
              setError(
                'The profile or sign-in preference could not be saved. Check browser storage permissions.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Nickname
            <input
              autoFocus
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={60}
              placeholder="How should we call you?"
            />
          </label>
          <label className="field">
            Units
            <select
              value={unitSystem}
              title="Choose display units across the app. Original measurements stay unchanged."
              onChange={(event) => setUnitSystem(event.target.value as typeof unitSystem)}
            >
              <option value="imperial">Imperial — ft/s, ft, in, °F</option>
              <option value="metric">Metric — m/s, m, cm, °C</option>
            </select>
            <small>Applies throughout the workspace. Original measurements stay unchanged.</small>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={remember}
              title="Keep connected-source sessions between visits on this browser profile. Passwords are never saved."
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>
              Allow sign-in to be remembered on this device
              <small>
                Keep connected-source sessions between visits. When off, sign-in lasts until this
                page closes or reloads. Passwords are never saved. Anyone using this browser profile
                can access remembered accounts; leave this off on shared devices.
              </small>
            </span>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={refresh}
              title="Refresh every enabled source when the app opens; sources needing sign-in or files wait for your input."
              onChange={(event) => setRefresh(event.target.checked)}
            />
            <span>
              Refresh all enabled sources after startup
              <small>
                Signed-in Caldwell sources refresh online. Other sources wait for sign-in or file
                selection.
              </small>
            </span>
          </label>
          <p className="notice">
            Measurements and settings stay in this browser's local storage. Clearing site data or
            changing browser will remove access to this workspace. Keep your original exports.
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer className="dialog-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary" disabled={busy || refreshing}>
              Save profile
            </button>
          </footer>
        </form>
      </div>
    </Modal>
  );
}
