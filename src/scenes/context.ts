import type { CloudStatus } from '../account/cloudStatus.ts';
import type { AudioPort } from '../audio/AudioEngine.ts';
import type { OfflineEarnings } from '../core/economy.ts';
import type { Emitter } from '../core/emitter.ts';
import type { GameModel } from '../core/GameModel.ts';
import type { Entity } from '../core/types.ts';
import type { InstallPrompt } from '../install/InstallPrompt.ts';

/** Avisos y pedidos entre escenas (no son cambios de estado del juego, por eso no salen del modelo). */
export interface UiEvents {
  toast: { text: string };
  /** Pedido de mostrar un piso (pestañas, teclado, debug). GameScene valida y cambia. */
  selectFloor: { floor: number };
  /** La UIScene pide mostrar el cierre de un piso: el campo baja la persiana sobre lo que tenía. */
  showClosing: { floor: number; entities: readonly Readonly<Entity>[] };
  /** El campo terminó de mostrar el cierre. */
  closingShown: { floor: number };
}

/** Estado de la vista compartido entre escenas. No se guarda. */
export interface ViewState {
  /** Piso que muestra el campo ahora (al abrir el juego, el más alto desbloqueado). */
  floor: number;
  /** Ingreso offline ya sumado que falta mostrar; la UIScene abre el popup y lo limpia. */
  welcome: OfflineEarnings | null;
}

/** La cuenta con la que se juega (botón 👤). */
export interface AccountPort {
  readonly email: string;
  /** Cómo está la partida en la nube. */
  cloudStatus(): Readonly<CloudStatus>;
  /** Guarda (también en la nube), cierra la sesión y vuelve a la pantalla de ingreso. */
  signOut(): void;
}

/** Lo que main.ts le pasa a las escenas por constructor (sin variables globales). */
export interface GameContext {
  readonly model: GameModel;
  readonly ui: Emitter<UiEvents>;
  readonly view: ViewState;
  readonly audio: AudioPort;
  /** Acceso directo: si ofrecerlo y el diálogo del navegador. */
  readonly install: InstallPrompt;
  readonly account: AccountPort;
  /** Guarda ya mismo. */
  saveNow(): void;
  /** Borra la partida y guarda el estado nuevo. */
  resetGame(): void;
}
