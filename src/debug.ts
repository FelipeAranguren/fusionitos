import type Phaser from 'phaser';
import type { AudioEngine } from './audio/AudioEngine.ts';
import { GAME_HEIGHT, GAME_WIDTH } from './config/visuals.ts';
import type { GameModel } from './core/GameModel.ts';
import type { Creature, Egg } from './core/types.ts';
import type { GameContext } from './scenes/context.ts';
import type { DebugView, GameScene } from './scenes/GameScene.ts';
import type { UIScene } from './scenes/UIScene.ts';

interface PagePoint {
  x: number;
  y: number;
}

/** Ayudas para probar el juego desde la consola o con Playwright. Solo en desarrollo. */
export interface DebugApi {
  model: GameModel;
  game: Phaser.Game;
  spawnEgg(): Egg | null;
  spawnCreature(level: number): Creature | null;
  addCoins(amount: number): void;
  /** Simula volver después de `ms` de ausencia (ingreso offline y bienvenida). */
  simulateAway(ms: number): void;
  /** Estado del audio y los últimos sonidos que sonaron. */
  audio(): { state: string; musicOn: boolean; sfxOn: boolean; musicPlaying: boolean; recent: string[] };
  /** Acceso directo: si se ofrece y para qué sistema son los pasos. */
  install(): { available: boolean; platform: string };
  /** Pide mostrar un piso (igual que tocar su pestaña). */
  selectFloor(floor: number): void;
  /** Piso que muestra el campo ahora (índice desde 0). */
  currentFloor(): number;
  /** Entidades visibles con su posición en píxeles de la página. */
  entities(): (DebugView & { page: PagePoint })[];
  /** Botones y pestañas ("tab:N") visibles, con su centro en píxeles de la página. */
  buttons(): { label: string; page: PagePoint }[];
  toPage(x: number, y: number): PagePoint;
  clearSave(): void;
}

declare global {
  interface Window {
    __debug?: DebugApi;
  }
}

interface DebugOptions {
  clearSave(): void;
  simulateAway(ms: number): void;
  audio: AudioEngine;
}

export function installDebugHooks(game: Phaser.Game, ctx: GameContext, { clearSave, simulateAway, audio }: DebugOptions): void {
  const { model } = ctx;
  const toPage = (x: number, y: number): PagePoint => {
    const rect = game.canvas.getBoundingClientRect();
    return { x: rect.left + (x / GAME_WIDTH) * rect.width, y: rect.top + (y / GAME_HEIGHT) * rect.height };
  };
  window.__debug = {
    model,
    game,
    spawnEgg: () => model.debugSpawnEgg(),
    spawnCreature: (level) => model.debugAddCreature(level),
    addCoins: (amount) => model.debugAddCoins(amount),
    simulateAway,
    audio: () => ({
      state: audio.state,
      musicOn: audio.musicOn,
      sfxOn: audio.sfxOn,
      musicPlaying: audio.musicPlaying,
      recent: [...audio.recent],
    }),
    install: () => ({ available: ctx.install.available, platform: ctx.install.platform }),
    selectFloor: (floor) => ctx.ui.emit('selectFloor', { floor }),
    currentFloor: () => ctx.view.floor,
    entities: () => game.scene.getScene<GameScene>('Game').debugViews().map((view) => ({ ...view, page: toPage(view.x, view.y) })),
    buttons: () =>
      game.scene
        .getScene<UIScene>('UI')
        .debugButtons()
        .map(({ label, x, y }) => ({ label, page: toPage(x, y) })),
    toPage,
    clearSave,
  };
}
