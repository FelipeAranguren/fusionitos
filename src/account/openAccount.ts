import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { CLOUD_SAVE } from '../config/cloud.ts';
import { STRINGS } from '../config/strings.ts';
import { highestUnlockedFloor } from '../core/field.ts';
import { floorConfig } from '../core/levels.ts';
import {
  DEVICE_BACKUP_KEY,
  SaveManager,
  accountSaveKey,
  parseSave,
  type LoadedSave,
  type StorageLike,
} from '../core/save.ts';
import { chooseStartingSave } from '../core/saveChoice.ts';
import { AccountScreen, type AccountFormHandlers } from './AccountScreen.ts';
import { authErrorMessage, credentialsProblem } from './authErrors.ts';
import { CloudSave } from './CloudSave.ts';
import { firebaseConfigured, initFirebase } from './firebase.ts';
import { withTimeout } from './withTimeout.ts';

const TEXT = STRINGS.account;

/** Una cuenta con la sesión abierta y la partida con la que arranca. */
export interface OpenAccount {
  readonly email: string;
  /** La pantalla de la cuenta: oculta mientras se juega; muestra los avisos y la espera al cerrar sesión. */
  readonly screen: AccountScreen;
  /** La copia de la partida de la cuenta en este dispositivo. */
  readonly saves: SaveManager;
  /** Con qué partida arranca; null: partida nueva. */
  readonly loaded: LoadedSave | null;
  readonly cloud: CloudSave;
  /** Si al abrir se pudo leer la nube. Si no, la partida se toma en la primera subida que funcione. */
  readonly cloudReachable: boolean;
  signOut(): Promise<void>;
}

/**
 * Muestra la pantalla de la cuenta hasta que hay sesión y partida.
 * `onTakenOver`: otra apertura del juego tomó la partida (ver CloudSave).
 */
export async function openAccount(storage: StorageLike | null, onTakenOver: () => void): Promise<OpenAccount> {
  const screen = new AccountScreen(document.body);
  if (!firebaseConfigured) {
    await screen.showMessage(TEXT.notConfiguredTitle, TEXT.notConfiguredBody, TEXT.reload);
    window.location.reload();
    return new Promise<OpenAccount>(() => undefined);
  }
  screen.showLoading(TEXT.loading);
  const { auth, db } = initFirebase();
  // La partida de antes de las cuentas, si la hay: pasa a la primera cuenta que entra en este dispositivo.
  const device = new SaveManager(storage);
  const deviceSave = device.load();
  const user = await waitForUser(auth, screen, deviceSave);

  screen.showLoading(TEXT.loadingSave);
  const saves = new SaveManager(storage, { key: accountSaveKey(user.uid) });
  const cloud = new CloudSave(db, user.uid, onTakenOver);
  const fromCloud = await loadFromCloud(cloud, saves, screen);
  const choice = chooseStartingSave({ cloud: fromCloud.save, local: saves.load(), device: deviceSave });
  if (deviceSave) device.archive(DEVICE_BACKUP_KEY);
  screen.hide();
  return {
    email: user.email ?? '',
    screen,
    saves,
    loaded: choice.save,
    cloud,
    cloudReachable: fromCloud.reachable,
    signOut: () => signOut(auth),
  };
}

/** La sesión guardada en el navegador o, si no hay, el formulario hasta que se entra o se crea la cuenta. */
function waitForUser(auth: Auth, screen: AccountScreen, deviceSave: LoadedSave | null): Promise<User> {
  return new Promise((resolve) => {
    let formShown = false;
    const stop = onAuthStateChanged(auth, (user) => {
      if (user) {
        stop();
        resolve(user);
      } else if (!formShown) {
        formShown = true;
        screen.showForm(formHandlers(auth), deviceNote(deviceSave));
      }
    });
  });
}

function formHandlers(auth: Auth): AccountFormHandlers {
  return {
    async submit(mode, email, password) {
      const problem = credentialsProblem(mode, email, password);
      if (problem) return problem;
      try {
        if (mode === 'signUp') await createUserWithEmailAndPassword(auth, email, password);
        else await signInWithEmailAndPassword(auth, email, password);
        return null;
      } catch (error) {
        return authErrorMessage(error);
      }
    },
    async forgot(email) {
      try {
        await sendPasswordResetEmail(auth, email);
        return { ok: true, text: TEXT.resetSent(email) };
      } catch (error) {
        return { ok: false, text: authErrorMessage(error) };
      }
    },
  };
}

/** Aviso de que la partida de este dispositivo no se pierde al entrar. */
function deviceNote(save: LoadedSave | null): string | null {
  if (!save) return null;
  const floor = highestUnlockedFloor(save.state);
  return TEXT.deviceSave(floor, floorConfig(floor).name);
}

/**
 * La partida de la cuenta en la nube. Sin conexión se puede seguir con la copia de este dispositivo;
 * si no hay copia, no se sabe qué tiene la cuenta, así que se pide reintentar.
 */
async function loadFromCloud(
  cloud: CloudSave,
  saves: SaveManager,
  screen: AccountScreen,
): Promise<{ save: LoadedSave | null; reachable: boolean }> {
  for (;;) {
    try {
      const parsed = parseSave(await withTimeout(cloud.load(), CLOUD_SAVE.timeoutMs));
      if (parsed.status === 'invalid') console.warn(`[nube] partida inválida (${parsed.reason}): se ignora.`);
      const save = parsed.status === 'ok' ? { state: parsed.state, savedAt: parsed.savedAt } : null;
      return { save, reachable: true };
    } catch (error) {
      console.warn('[nube] no se pudo leer la partida:', error);
      if (saves.load()) return { save: null, reachable: false };
      await screen.showMessage(TEXT.loadFailedTitle, TEXT.loadFailedBody, TEXT.retry);
      screen.showLoading(TEXT.loadingSave);
    }
  }
}
