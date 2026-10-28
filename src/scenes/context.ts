import type { AudioPort } from '../audio/AudioEngine.ts';
import type { OfflineEarnings } from '../core/economy.ts';
import type { Emitter } from '../core/emitter.ts';
import type { GameModel } from '../core/GameModel.ts';

/** Avisos y pedidos entre escenas (no son cambios de estado del juego, por eso no salen del modelo). */
export interface UiEvents {
  toast: { text: string };
  /** Pedido de mostrar un piso (pestañas, teclado, debug). GameScene valida y cambia. */
  selectFloor: { floor: number };
}

/** Estado de la vista compartido entre escenas. No se guarda. */
export interface ViewState {
  /** Piso que muestra el campo ahora (al recargar, el 1). */
  floor: number;
  /** Ingreso offline ya sumado que falta mostrar; la UIScene abre el popup y lo limpia. */
  welcome: OfflineEarnings | null;
}

/** Lo que main.ts le pasa a las escenas por constructor (sin variables globales). */
export interface GameContext {
  readonly model: GameModel;
  readonly ui: Emitter<UiEvents>;
  readonly view: ViewState;
  readonly audio: AudioPort;
  /** Guarda ya mismo. */
  saveNow(): void;
  /** Borra la partida y guarda el estado nuevo. */
  resetGame(): void;
}
