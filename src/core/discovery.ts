import type { DeepReadonly, GameState } from './types.ts';

export function isDiscovered(state: DeepReadonly<GameState>, level: number): boolean {
  return state.discovered.includes(level);
}

/** Marca un nivel como descubierto. Devuelve true si es la primera vez. */
export function markDiscovered(state: GameState, level: number): boolean {
  if (state.discovered.includes(level)) return false;
  state.discovered.push(level);
  state.discovered.sort((a, b) => a - b);
  return true;
}

/** Nivel más alto descubierto (0 si todavía no hay ninguno). */
export function maxDiscoveredLevel(state: DeepReadonly<GameState>): number {
  return state.discovered.reduce((max, level) => Math.max(max, level), 0);
}
