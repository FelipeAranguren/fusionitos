import { STRINGS } from '../config/strings.ts';
import { formatDuration } from '../core/format.ts';

export interface CloudStatus {
  /** Última vez que la partida quedó en la nube (ms epoch); null si todavía no subió. */
  savedAt: number | null;
  /** La última subida falló (por lo general, sin conexión). */
  failing: boolean;
  /** Otra apertura del juego tomó la partida: esta ya no guarda. */
  takenOver: boolean;
}

/** La línea del popup de la cuenta que dice cómo está la partida en la nube. */
export function describeCloudStatus(status: Readonly<CloudStatus>, now: number): string {
  if (status.failing) return STRINGS.account.cloudFailing;
  if (status.savedAt === null) return STRINGS.account.cloudPending;
  return STRINGS.account.cloudSaved(formatDuration(now - status.savedAt));
}
