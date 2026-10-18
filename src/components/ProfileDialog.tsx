import { useState } from 'react';
import type { DataSource, Profile } from '../domain/model';
import { saveProfile } from '../storage/workspace';
import { Modal } from './Modal';

/** Edit the browser profile and apply explicit consent changes to existing SDK sessions. */
export function ProfileDialog({
  profile,
  sources,
  refreshing,
  onClose,
}: {
  profile: Profile;
  sources: DataSource[];
  refreshing: boolean;
  onClose: () => void;
}) {
  const [nickname, setNickname] = useState(profile.nickname);
  const [remember, setRemember] = useState(profile.rememberSignIn);
  const [refresh, setRefresh] = useState(profile.refreshOnStart);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Your local profile" onClose={onClose}>
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
        <label className="check-field">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          <span>
            Allow sign-in to be remembered on this device
            <small>
              Keep connected-source sessions between visits. When off, sign-in lasts until this page
              closes or reloads. Passwords are never saved. Anyone using this browser profile can
              access remembered accounts; leave this off on shared devices.
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
    </Modal>
  );
}
