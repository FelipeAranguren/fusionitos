import { describe, expect, it, vi } from 'vitest';
import { STRINGS } from '../config/strings.ts';
import { authErrorMessage, credentialsProblem } from './authErrors.ts';

const { errors } = STRINGS.account;
const firebaseError = (code: string) => Object.assign(new Error(code), { code });

describe('datos del formulario', () => {
  it('pide mail y contraseña', () => {
    expect(credentialsProblem('signIn', '  ', 'secreta')).toBe(errors.missingEmail);
    expect(credentialsProblem('signIn', 'a@b.com', '')).toBe(errors.missingPassword);
    expect(credentialsProblem('signIn', 'a@b.com', 'x')).toBeNull();
  });

  it('al crear la cuenta, la contraseña tiene que tener al menos 6 caracteres', () => {
    expect(credentialsProblem('signUp', 'a@b.com', '12345')).toBe(errors.weakPassword(6));
    expect(credentialsProblem('signUp', 'a@b.com', '123456')).toBeNull();
  });
});

describe('errores de Firebase en español', () => {
  it('mail o contraseña incorrectos, sin decir cuál', () => {
    for (const code of ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found']) {
      expect(authErrorMessage(firebaseError(code))).toBe(errors.wrongCredentials);
    }
  });

  it('cada caso conocido tiene su mensaje', () => {
    expect(authErrorMessage(firebaseError('auth/email-already-in-use'))).toBe(errors.emailInUse);
    expect(authErrorMessage(firebaseError('auth/invalid-email'))).toBe(errors.invalidEmail);
    expect(authErrorMessage(firebaseError('auth/weak-password'))).toBe(errors.weakPassword(6));
    expect(authErrorMessage(firebaseError('auth/too-many-requests'))).toBe(errors.tooManyRequests);
    expect(authErrorMessage(firebaseError('auth/network-request-failed'))).toBe(errors.network);
    expect(authErrorMessage(firebaseError('auth/operation-not-allowed'))).toBe(errors.notConfigured);
  });

  it('lo desconocido da un mensaje genérico', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(authErrorMessage(firebaseError('auth/algo-nuevo'))).toBe(errors.unknown);
    expect(authErrorMessage('texto')).toBe(errors.unknown);
    expect(authErrorMessage(null)).toBe(errors.unknown);
    warn.mockRestore();
  });
});
