import { useState } from 'react';
import type { DataSource, Profile, FieldDefinition, Tag } from '../domain/model';
import { CustomizationManager } from './CustomizationManager';
import { saveProfile } from '../storage/workspace';
import { Modal } from './Modal';

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
  const [tab, setTab] = useState<'general' | 'fields' | 'tags'>('general');
  const [nickname, setNickname] = useState(profile.nickname);
  const [remember, setRemember] = useState(profile.rememberSignIn);
  const [refresh, setRefresh] = useState(profile.refreshOnStart);
  const [unitSystem, setUnitSystem] = useState(profile.unitSystem ?? 'imperial');
  const [shotDetail, setShotDetail] = useState(profile.shotDetail ?? 'muzzleVelocity');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Your local profile" onClose={onClose} wide>
      <div className="segmented profile-tabs" aria-label="Profile sections">
        {(['general', 'fields', 'tags'] as const).map((value) => (
          <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>
            {value === 'general' ? 'General' : value === 'fields' ? 'Custom fields' : 'Tags'}
          </button>
        ))}
      </div>
      {tab !== 'general' && (
        <CustomizationManager key={tab} kind={tab} fields={fields} tags={tags} />
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
                shotDetail,
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
              onChange={(event) => setUnitSystem(event.target.value as typeof unitSystem)}
            >
              <option value="imperial">Imperial — ft/s, ft, °F</option>
              <option value="metric">Metric — m/s, m, °C</option>
            </select>
            <small>Applies throughout the workspace. Original measurements stay unchanged.</small>
          </label>
          <label className="field">
            Shot detail
            <select
              value={shotDetail}
              onChange={(event) => setShotDetail(event.target.value as typeof shotDetail)}
            >
              <option value="muzzleVelocity">Muzzle velocity</option>
              <option value="g1">G1</option>
              <option value="g7">G7</option>
            </select>
            <small>The emphasized reading in the shot table below the chart.</small>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={remember}
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
