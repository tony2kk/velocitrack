import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { FileUp, LogIn, LogOut, RefreshCw } from 'lucide-react';
import type { DataSource } from '../domain/model';
import { db } from '../storage/database';
import { refreshCaldwell } from '../sources/refresh';
import { parseConnectionSettings } from '../sources/caldwell/configuration';
import { connectionError } from '../sources/caldwell/errors';
import { getSession } from '../sources/caldwell/session';

export default function CaldwellSource({
  source,
  remember,
  busy,
  onMessage,
}: {
  source: DataSource;
  remember: boolean;
  busy: boolean;
  onMessage: (message: string) => void;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const disabled = busy || working;
  useEffect(() => {
    if (!source.connection) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void getSession(source, remember)
      .then(({ auth }) => {
        if (active) unsubscribe = onAuthStateChanged(auth, (user) => setSignedIn(!!user));
      })
      .catch((error: unknown) => {
        if (active) setError(connectionError(error).message);
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [source, remember]);

  async function refresh(credentials?: { email: string; password: string }) {
    setWorking(true);
    setError('');
    const attempt = refreshCaldwell(source.id, credentials);
    setPassword('');
    try {
      const counts = await attempt;
      setEmail('');
      onMessage(`${source.name}: ${counts.series} series and ${counts.shots} shots imported.`);
    } catch (error) {
      setError(connectionError(error).message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="caldwell-connection">
      {!source.connection ? (
        <>
          <p className="muted">
            Add the permitted connection settings once, then sign in with your Caldwell account.
            Settings are saved only in this browser.
          </p>
          <label className={`file-picker ${disabled ? 'disabled' : ''}`}>
            <FileUp size={18} />
            <span>
              Add connection settings<small>Select your local connection JSON file.</small>
            </span>
            <input
              type="file"
              accept=".json,application/json"
              disabled={disabled}
              aria-label={`Connection settings for ${source.name}`}
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                setWorking(true);
                setError('');
                try {
                  if (file.size > 16_384)
                    throw new Error('Connection settings must be smaller than 16 KB.');
                  const connection = parseConnectionSettings(await file.text());
                  await db.sources.update(source.id, {
                    connection,
                    status: 'needs-sign-in',
                    error: undefined,
                  });
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : 'Connection settings could not be saved.',
                  );
                } finally {
                  input.value = '';
                  setWorking(false);
                }
              }}
            />
          </label>
        </>
      ) : signedIn && source.status !== 'needs-sign-in' ? (
        <div className="connection-actions">
          <p className="connection-state">
            Signed in · {remember ? 'Remembered on this device' : 'Current session only'}
          </p>
          <button className="primary" disabled={disabled} onClick={() => void refresh()}>
            <RefreshCw size={17} />
            {disabled ? 'Refreshing…' : 'Refresh now'}
          </button>
          <button
            disabled={disabled}
            onClick={async () => {
              setWorking(true);
              setError('');
              try {
                const { auth } = await getSession(source, remember);
                await signOut(auth);
                await db.sources.update(source.id, { status: 'needs-sign-in', error: undefined });
              } catch (error) {
                setError(connectionError(error).message);
              } finally {
                setWorking(false);
              }
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      ) : (
        <form
          className="connection-form"
          onSubmit={(event) => {
            event.preventDefault();
            void refresh({ email, password });
          }}
        >
          <label className="field">
            Caldwell email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              disabled={disabled}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              autoComplete="off"
              required
              value={password}
              disabled={disabled}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <p className="fine-print">
            Sign-in goes directly to Firebase for your Caldwell account. Passwords are never saved
            by VelociTrack.{' '}
            {remember
              ? 'You allowed this browser to remember sign-in.'
              : 'Sign-in lasts until this page closes or reloads.'}
          </p>
          <button className="primary" disabled={disabled || !email.trim() || !password}>
            <LogIn size={17} />
            {disabled ? 'Connecting…' : 'Sign in and import'}
          </button>
        </form>
      )}
      {error && error !== source.error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <small className="muted">
        Read-only access to your own series and shots. Imported measurements remain available
        offline.
      </small>
    </div>
  );
}
