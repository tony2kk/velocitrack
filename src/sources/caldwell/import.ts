import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { defaultProfile } from '../../domain/model';
import { db } from '../../storage/database';
import { importBundle } from '../../storage/workspace';
import { CaldwellError, connectionError } from './errors';
import { getSession } from './session';
import { createCollectionReader, readAccount } from './read';

/** Authenticate if requested, download only the bound owner's data, then commit one validated bundle. */
export async function importCaldwell(
  sourceId: string,
  credentials?: { email: string; password: string },
) {
  try {
    const source = await db.sources.get(sourceId);
    if (!source || source.kind !== 'caldwell')
      throw new CaldwellError('This Caldwell source no longer exists.', 'setup');
    await db.sources.update(sourceId, {
      error: undefined,
      lastAttemptAt: new Date().toISOString(),
    });
    const profile = (await db.profiles.get('local')) ?? defaultProfile();
    const { auth, database } = await getSession(source, profile.rememberSignIn);
    if (credentials)
      await signInWithEmailAndPassword(auth, credentials.email.trim(), credentials.password);
    const user = auth.currentUser;
    if (!user) throw new CaldwellError('Sign in to refresh this Caldwell source.', 'sign-in');
    try {
      await db.transaction('rw', db.sources, async () => {
        // Bind before network reads so a different account cannot replace this source's identity.
        const current = await db.sources.get(sourceId);
        if (
          !current ||
          current.kind !== 'caldwell' ||
          current.connection?.projectId !== source.connection?.projectId
        )
          throw new CaldwellError('The source changed. Please reopen Sources.', 'setup');
        if (current.accountId && current.accountId !== user.uid)
          throw new CaldwellError(
            'This source belongs to a different account. Use its original account or create another source.',
            'sign-in',
          );
        await db.sources.update(sourceId, {
          accountId: user.uid,
          lastAttemptAt: new Date().toISOString(),
        });
      });
    } catch (error) {
      await signOut(auth);
      throw error;
    }
    const bundle = await readAccount(user.uid, createCollectionReader(database));
    // Signing out or changing users during the download invalidates the pending import.
    if (auth.currentUser?.uid !== user.uid)
      throw new CaldwellError('Your session changed during refresh. Sign in again.', 'sign-in');
    try {
      return await importBundle(sourceId, bundle, db, user.uid);
    } catch (error) {
      // Local catalog errors contain useful local names, never Firebase response details.
      throw new CaldwellError(
        error instanceof Error ? error.message : 'The import could not be saved.',
        'import',
      );
    }
  } catch (error) {
    const failure = connectionError(error);
    try {
      await db.sources.update(sourceId, {
        status:
          failure.category === 'setup'
            ? 'needs-setup'
            : failure.category === 'sign-in'
              ? 'needs-sign-in'
              : 'error',
        error: failure.message,
        lastAttemptAt: new Date().toISOString(),
      });
    } catch {
      /* Preserve the original failure when browser storage is unavailable. */
    }
    throw failure;
  }
}
