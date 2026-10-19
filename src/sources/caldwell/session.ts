import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
  setPersistence,
  signOut,
  type Auth,
} from 'firebase/auth';
import { getFirestore, terminate, type Firestore } from 'firebase/firestore/lite';
import type { DataSource } from '../../domain/model';
import { CaldwellError } from './errors';

/** SDK handles isolated to one source; Firestore Lite keeps no persistent measurement cache. */
export interface CaldwellSession {
  app: FirebaseApp;
  auth: Auth;
  database: Firestore;
  remembered?: boolean;
}

// Cache initialization promises as well as ready sessions to prevent duplicate named Firebase apps.
const sessions = new Map<string, Promise<CaldwellSession>>();

/** Initialize or reuse the source's SDK session, awaiting any explicitly opted-in auth restoration. */
export async function getSession(source: DataSource, remember: boolean): Promise<CaldwellSession> {
  if (!source.connection || source.kind !== 'caldwell')
    throw new CaldwellError('Caldwell sign-in is not ready. Please try again.', 'setup');
  let pending = sessions.get(source.id);
  if (!pending) {
    const connection = source.connection;
    pending = (async () => {
      const app = initializeApp(connection, `velocitrack-${source.id}`);
      try {
        const auth = initializeAuth(app, {
          persistence: remember ? indexedDBLocalPersistence : inMemoryPersistence,
        });
        await auth.authStateReady();
        return { app, auth, database: getFirestore(app), remembered: remember };
      } catch (error) {
        await deleteApp(app);
        throw error;
      }
    })();
    sessions.set(source.id, pending);
    void pending.catch(() => sessions.delete(source.id));
  }
  const session = await pending;
  // Another tab can change the local opt-in while this tab already has an SDK handle.
  if (session.remembered !== remember) {
    await setPersistence(session.auth, remember ? indexedDBLocalPersistence : inMemoryPersistence);
    session.remembered = remember;
  }
  return session;
}

/** Migrate configured SDK sessions after a profile consent change; password storage is never involved. */
export async function changeSessionPersistence(
  sources: DataSource[],
  wasRemembered: boolean,
  remember: boolean,
) {
  for (const source of sources.filter((item) => item.kind === 'caldwell' && item.connection)) {
    const session = await getSession(source, wasRemembered);
    await setPersistence(session.auth, remember ? indexedDBLocalPersistence : inMemoryPersistence);
    session.remembered = remember;
  }
}

/** Sign out and dispose all handles before source removal, including any persisted SDK session. */
export async function forgetSession(source: DataSource, remember: boolean) {
  if (source.kind !== 'caldwell' || !source.connection) return;
  const session = await getSession(source, remember);
  await signOut(session.auth);
  await terminate(session.database);
  await deleteApp(session.app);
  sessions.delete(source.id);
}
