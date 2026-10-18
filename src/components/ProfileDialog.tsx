import { useState } from 'react';
import type { Profile } from '../domain/model';
import { saveProfile } from '../storage/workspace';
import { Modal } from './Modal';

export function ProfileDialog({ profile, onClose }: { profile: Profile; onClose: () => void }) {
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
            await saveProfile({
              nickname: nickname.trim(),
              rememberSignIn: remember,
              refreshOnStart: refresh,
            });
            onClose();
          } catch {
            setError('The profile could not be saved. Check browser storage permissions.');
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
              Reserved for future connected sources. File sources use no credentials. Passwords will
              never be saved.
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
              File sources will be marked as awaiting files. Choose their latest exports to finish
              refreshing.
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
          <button className="primary" disabled={busy}>
            Save profile
          </button>
        </footer>
      </form>
    </Modal>
  );
}
