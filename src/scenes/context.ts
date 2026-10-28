import type { Emitter } from '../core/emitter.ts';
import type { GameModel } from '../core/GameModel.ts';

/** Avisos de la vista para la UI (no son cambios de estado, por eso no salen del modelo). */
export interface UiEvents {
  toast: { text: string };
}

/** Lo que main.ts le pasa a las escenas por constructor (sin variables globales). */
export interface GameContext {
  readonly model: GameModel;
  readonly ui: Emitter<UiEvents>;
  /** Guarda ya mismo. */
  saveNow(): void;
  /** Borra la partida y guarda el estado nuevo. */
  resetGame(): void;
}
