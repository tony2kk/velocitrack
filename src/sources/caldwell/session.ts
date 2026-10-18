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

export interface CaldwellSession {
  app: FirebaseApp;
  auth: Auth;
  database: Firestore;
}

const sessions = new Map<string, Promise<CaldwellSession>>();

export async function getSession(source: DataSource, remember: boolean): Promise<CaldwellSession> {
  if (!source.connection || source.kind !== 'caldwell')
    throw new CaldwellError('Add connection settings before signing in.', 'setup');
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
        return { app, auth, database: getFirestore(app) };
      } catch (error) {
        await deleteApp(app);
        throw error;
      }
    })();
    sessions.set(source.id, pending);
    void pending.catch(() => sessions.delete(source.id));
  }
  return pending;
}

export async function changeSessionPersistence(
  sources: DataSource[],
  wasRemembered: boolean,
  remember: boolean,
) {
  for (const source of sources.filter((item) => item.kind === 'caldwell' && item.connection)) {
    const { auth } = await getSession(source, wasRemembered);
    await setPersistence(auth, remember ? indexedDBLocalPersistence : inMemoryPersistence);
  }
}

export async function forgetSession(source: DataSource, remember: boolean) {
  if (source.kind !== 'caldwell' || !source.connection) return;
  const session = await getSession(source, remember);
  await signOut(session.auth);
  await terminate(session.database);
  await deleteApp(session.app);
  sessions.delete(source.id);
}
