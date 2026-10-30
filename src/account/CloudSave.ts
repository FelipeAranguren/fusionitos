import { doc, getDoc, runTransaction, setDoc, type DocumentReference, type Firestore } from 'firebase/firestore/lite';
import type { CloudStatus } from './cloudStatus.ts';
import { canPush } from './ownership.ts';

/** Cómo terminó una subida. `taken-over`: otra apertura del juego tomó la partida y esta ya no guarda. */
export type PushResult = 'saved' | 'taken-over' | 'failed';

/**
 * La partida de una cuenta en Firestore: `saves/{uid}`, con el guardado (el mismo texto que en localStorage)
 * y `session`, la apertura del juego que la usa ahora (la última que la abrió).
 */
export class CloudSave {
  /** Identifica esta apertura del juego. */
  readonly session = newSessionId();
  private readonly db: Firestore;
  private readonly ref: DocumentReference;
  private readonly onTakenOver: () => void;
  private claimed = false;
  private inFlight: Promise<PushResult> | null = null;
  private current: CloudStatus = { savedAt: null, failing: false, takenOver: false };

  constructor(db: Firestore, uid: string, onTakenOver: () => void) {
    this.db = db;
    this.ref = doc(db, 'saves', uid);
    this.onTakenOver = onTakenOver;
  }

  get status(): Readonly<CloudStatus> {
    return this.current;
  }

  /** El guardado de la cuenta, o null si todavía no tiene. Lanza si no se pudo leer (sin conexión). */
  async load(): Promise<string | null> {
    const snapshot = await getDoc(this.ref);
    const save: unknown = snapshot.get('save');
    return typeof save === 'string' ? save : null;
  }

  /** Al abrir el juego: esta apertura pasa a usar la partida y la sube tal como arranca. */
  async claim(save: string): Promise<void> {
    try {
      await setDoc(this.ref, { save, session: this.session });
      this.claimed = true;
      this.current = { ...this.current, savedAt: Date.now(), failing: false };
    } catch {
      // La toma la primera subida que funcione.
      this.current = { ...this.current, failing: true };
    }
  }

  /** Sube la partida, salvo que otra apertura la haya tomado. Si ya hay una subida en curso, espera esa. */
  push(save: () => string): Promise<PushResult> {
    if (this.current.takenOver) return Promise.resolve('taken-over');
    this.inFlight ??= this.write(save()).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async write(save: string): Promise<PushResult> {
    try {
      const result = await runTransaction(this.db, async (transaction): Promise<PushResult> => {
        const snapshot = await transaction.get(this.ref);
        if (!canPush(this.claimed, snapshot.get('session'), this.session)) return 'taken-over';
        transaction.set(this.ref, { save, session: this.session });
        return 'saved';
      });
      if (result === 'saved') {
        this.claimed = true;
        this.current = { savedAt: Date.now(), failing: false, takenOver: false };
      } else {
        this.current = { ...this.current, takenOver: true };
        this.onTakenOver();
      }
      return result;
    } catch {
      this.current = { ...this.current, failing: true };
      return 'failed';
    }
  }
}

/** Al azar; `crypto.randomUUID` no existe fuera de https (por ejemplo, probando desde el celular en la red local). */
function newSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
