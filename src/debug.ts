import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/visuals.ts';
import type { GameModel } from './core/GameModel.ts';
import type { Creature, Egg } from './core/types.ts';
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
  /** Entidades visibles con su posición en píxeles de la página. */
  entities(): (DebugView & { page: PagePoint })[];
  /** Botones visibles con su centro en píxeles de la página. */
  buttons(): { label: string; page: PagePoint }[];
  toPage(x: number, y: number): PagePoint;
  clearSave(): void;
}

declare global {
  interface Window {
    __debug?: DebugApi;
  }
}

export function installDebugHooks(game: Phaser.Game, model: GameModel, clearSave: () => void): void {
  const toPage = (x: number, y: number): PagePoint => {
    const rect = game.canvas.getBoundingClientRect();
    return { x: rect.left + (x / GAME_WIDTH) * rect.width, y: rect.top + (y / GAME_HEIGHT) * rect.height };
  };
  window.__debug = {
    model,
    game,
    spawnEgg: () => model.debugSpawnEgg(),
    spawnCreature: (level) => model.debugAddCreature(level),
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
