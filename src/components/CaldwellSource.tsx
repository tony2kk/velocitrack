import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { LogIn, LogOut, RefreshCw } from 'lucide-react';
import type { DataSource } from '../domain/model';
import { db } from '../storage/database';
import { refreshCaldwell } from '../sources/refresh';
import { connectionError } from '../sources/caldwell/errors';
import { getSession } from '../sources/caldwell/session';
import { prepareCaldwellSource } from '../sources/caldwell/setup';
import { importMessage } from '../sources/feedback';

/** Manage one source's local setup, SDK sign-in state and explicit read-only import actions. */
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
  const [setupAttempt, setSetupAttempt] = useState(0);
  const disabled = busy || working;
  useEffect(() => {
    let active = true;
    // SDK initialization can finish after the dialog closes; do not attach a stale subscription.
    let unsubscribe: (() => void) | undefined;
    void prepareCaldwellSource(source.id)
      .then((prepared) => getSession(prepared, remember))
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
  }, [source, remember, setupAttempt]);

  /** Start or join this source's import and clear credential inputs without persisting them. */
  async function refresh(credentials?: { email: string; password: string }) {
    setWorking(true);
    setError('');
    const attempt = refreshCaldwell(source.id, credentials);
    // Do not retain the password in component state while the download is running.
    setPassword('');
    try {
      const counts = await attempt;
      setEmail('');
      onMessage(importMessage(source.name, counts));
    } catch (error) {
      setError(connectionError(error).message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="caldwell-connection">
      {!source.connection ? (
        <div className="connection-actions">
          {error ? (
            <button
              onClick={() => {
                setError('');
                setSetupAttempt((attempt) => attempt + 1);
              }}
            >
              Try again
            </button>
          ) : (
            <p role="status" className="muted">
              Preparing Caldwell sign-in…
            </p>
          )}
        </div>
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
