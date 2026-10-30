import type { LoadedSave } from './save.ts';
import type { DeepReadonly, GameState } from './types.ts';

/** De dónde sale la partida con la que arranca una cuenta en un dispositivo. */
export type SaveOrigin = 'account' | 'device' | 'new';

export interface SaveCandidates {
  /** La de la cuenta en la nube (null si todavía no tiene). */
  cloud: LoadedSave | null;
  /** La copia de la cuenta guardada en este dispositivo. */
  local: LoadedSave | null;
  /** La que había en este dispositivo antes de las cuentas (sin dueño). */
  device: LoadedSave | null;
}

export interface SaveChoice {
  origin: SaveOrigin;
  /** null: partida nueva. */
  save: LoadedSave | null;
}

/**
 * Con qué partida arranca una cuenta en este dispositivo.
 * - De la cuenta vale la más nueva: la de la nube o la copia local (si se jugó sin conexión).
 * - La partida sin dueño del dispositivo pasa a la cuenta si la cuenta no tiene ninguna o si está más
 *   avanzada que la de la cuenta: así nadie pierde lo que tenía antes de las cuentas.
 */
export function chooseStartingSave({ cloud, local, device }: SaveCandidates): SaveChoice {
  const account = newest(cloud, local);
  if (device && (!account || compareProgress(device.state, account.state) > 0)) return { origin: 'device', save: device };
  if (account) return { origin: 'account', save: account };
  return { origin: 'new', save: null };
}

/** Positivo si `a` está más avanzada que `b`: manda la mejor criatura descubierta y, a igualdad, las monedas. */
export function compareProgress(a: DeepReadonly<GameState>, b: DeepReadonly<GameState>): number {
  return bestLevel(a) - bestLevel(b) || a.coins - b.coins;
}

function bestLevel(state: DeepReadonly<GameState>): number {
  return Math.max(0, ...state.discovered);
}

function newest(a: LoadedSave | null, b: LoadedSave | null): LoadedSave | null {
  if (!a || !b) return a ?? b;
  return b.savedAt > a.savedAt ? b : a;
}
