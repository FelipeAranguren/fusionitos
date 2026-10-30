import { CLOUD_SAVE } from '../config/cloud.ts';
import { STRINGS } from '../config/strings.ts';

/** Entrar a una cuenta existente o crear una nueva. */
export type AuthMode = 'signIn' | 'signUp';

const { errors } = STRINGS.account;

/** Lo que se puede revisar antes de ir a Firebase: el mensaje a mostrar, o null si está bien. */
export function credentialsProblem(mode: AuthMode, email: string, password: string): string | null {
  if (email.trim() === '') return errors.missingEmail;
  if (password === '') return errors.missingPassword;
  if (mode === 'signUp' && password.length < CLOUD_SAVE.minPasswordLength) {
    return errors.weakPassword(CLOUD_SAVE.minPasswordLength);
  }
  return null;
}

/** Mensaje para un error de Firebase Authentication, según su código (`auth/...`). */
export function authErrorMessage(error: unknown): string {
  switch (errorCode(error)) {
    case 'auth/missing-email':
      return errors.missingEmail;
    case 'auth/invalid-email':
      return errors.invalidEmail;
    case 'auth/missing-password':
      return errors.missingPassword;
    // Firebase no distingue "no existe" de "contraseña mal" (protección contra enumerar mails).
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return errors.wrongCredentials;
    case 'auth/email-already-in-use':
      return errors.emailInUse;
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return errors.weakPassword(CLOUD_SAVE.minPasswordLength);
    case 'auth/too-many-requests':
      return errors.tooManyRequests;
    case 'auth/network-request-failed':
      return errors.network;
    case 'auth/user-disabled':
      return errors.userDisabled;
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return errors.notConfigured;
    default:
      console.warn('[cuenta] error sin mensaje propio:', error);
      return errors.unknown;
  }
}

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
}
