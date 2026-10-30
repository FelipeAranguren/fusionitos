/**
 * Cuentas y partidas en la nube, con Firebase (Authentication + Firestore).
 * Estos datos no son secretos: van dentro del juego publicado. Lo que protege cada partida son las reglas
 * de Firestore (`firestore.rules`, publicadas también en la consola de Firebase).
 */
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Proyecto real (consola de Firebase → Configuración del proyecto → Tus apps → app web).
 * Sin `measurementId`: el juego no usa Analytics.
 */
export const FIREBASE_CONFIG: Readonly<FirebaseWebConfig> = {
  apiKey: 'AIzaSyB-UOTypKmqmUAYZZp4XT3KetlwUEgpRs8',
  authDomain: 'fusionitos.firebaseapp.com',
  projectId: 'fusionitos',
  storageBucket: 'fusionitos.firebasestorage.app',
  messagingSenderId: '969980111107',
  appId: '1:969980111107:web:b9df41ff0c4ee4eb5be136',
};

/** Emuladores locales (`npm run emulators`) para probar sin tocar el proyecto real (`npm run dev:emulators`). */
export const FIREBASE_EMULATORS = {
  /** Con el prefijo `demo-` los emuladores no necesitan un proyecto real ni conexión. */
  projectId: 'demo-fusionitos',
  authUrl: 'http://127.0.0.1:9099',
  firestoreHost: '127.0.0.1',
  firestorePort: 8080,
} as const;

export const CLOUD_SAVE = {
  /** Cada cuánto se sube la partida mientras se juega (además de al ocultar o cerrar el juego). */
  intervalMs: 60_000,
  /** Espera máxima para traer la partida al abrir el juego, o para subirla al cerrar sesión. */
  timeoutMs: 8_000,
  /** Lo mínimo que acepta Firebase por defecto. */
  minPasswordLength: 6,
} as const;
