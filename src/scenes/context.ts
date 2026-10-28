import type { Emitter } from '../core/emitter.ts';
import type { GameModel } from '../core/GameModel.ts';

/** Avisos y pedidos entre escenas (no son cambios de estado del juego, por eso no salen del modelo). */
export interface UiEvents {
  toast: { text: string };
  /** Pedido de mostrar un piso (pestañas, teclado, debug). GameScene valida y cambia. */
  selectFloor: { floor: number };
}

/** Estado de la vista compartido entre escenas. No se guarda: al recargar se vuelve al piso 1. */
export interface ViewState {
  /** Piso que muestra el campo ahora. */
  floor: number;
}

/** Lo que main.ts le pasa a las escenas por constructor (sin variables globales). */
export interface GameContext {
  readonly model: GameModel;
  readonly ui: Emitter<UiEvents>;
  readonly view: ViewState;
  /** Guarda ya mismo. */
  saveNow(): void;
  /** Borra la partida y guarda el estado nuevo. */
  resetGame(): void;
}
