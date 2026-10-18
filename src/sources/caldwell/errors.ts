export class CaldwellError extends Error {
  constructor(
    message: string,
    readonly category: 'setup' | 'sign-in' | 'access' | 'network' | 'import',
  ) {
    super(message);
    this.name = 'CaldwellError';
  }
}

/** Do not expose Firebase error bodies, URLs, account IDs or tokens in the UI. */
export function connectionError(error: unknown): CaldwellError {
  if (error instanceof CaldwellError) return error;
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return new CaldwellError(
        'Sign-in failed. Check your Caldwell email and password.',
        'sign-in',
      );
    case 'auth/user-disabled':
      return new CaldwellError('This account is disabled. Contact Caldwell support.', 'sign-in');
    case 'auth/too-many-requests':
    case 'resource-exhausted':
      return new CaldwellError(
        'The service is limiting requests. Wait before trying again.',
        'access',
      );
    case 'auth/user-token-expired':
    case 'auth/invalid-user-token':
    case 'unauthenticated':
      return new CaldwellError('Your session expired. Sign in again.', 'sign-in');
    case 'auth/network-request-failed':
    case 'unavailable':
    case 'deadline-exceeded':
      return new CaldwellError(
        'The service could not be reached. Check your connection and try again.',
        'network',
      );
    case 'permission-denied':
    case 'auth/app-not-authorized':
    case 'auth/unauthorized-domain':
    case 'auth/operation-not-allowed':
    case 'auth/invalid-api-key':
      return new CaldwellError(
        'Caldwell did not allow this browser connection. Check the permitted connection settings or contact support. No access restriction was bypassed.',
        'access',
      );
    default:
      return new CaldwellError(
        'The connection failed. Check the connection settings and try again.',
        'network',
      );
  }
}
