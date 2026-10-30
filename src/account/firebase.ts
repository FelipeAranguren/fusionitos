import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore/lite';
import { FIREBASE_CONFIG, FIREBASE_EMULATORS } from '../config/cloud.ts';

export interface Firebase {
  auth: Auth;
  db: Firestore;
}

/** Con `npm run dev:emulators` todo va a los emuladores locales; si no, al proyecto real. */
const USE_EMULATORS = import.meta.env.MODE === 'emulators';

/** Si están los datos del proyecto (`src/config/cloud.ts`); sin ellos no se puede entrar. */
export const firebaseConfigured = USE_EMULATORS || FIREBASE_CONFIG.apiKey !== '';

export function initFirebase(): Firebase {
  const options: FirebaseOptions = USE_EMULATORS
    ? { apiKey: 'demo-api-key', projectId: FIREBASE_EMULATORS.projectId }
    : FIREBASE_CONFIG;
  const app = initializeApp(options);
  // initializeAuth y no getAuth: sin el soporte de ventanas emergentes (no se usa), el juego pesa menos.
  const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  // El mail para elegir otra contraseña llega en español.
  auth.languageCode = 'es';
  // Firestore Lite: solo hace falta leer y escribir un documento por cuenta, sin caché ni tiempo real.
  const db = getFirestore(app);
  if (USE_EMULATORS) {
    connectAuthEmulator(auth, FIREBASE_EMULATORS.authUrl, { disableWarnings: true });
    connectFirestoreEmulator(db, FIREBASE_EMULATORS.firestoreHost, FIREBASE_EMULATORS.firestorePort);
  }
  return { auth, db };
}
