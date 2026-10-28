import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import Phaser from 'phaser';
import { BALANCE } from './config/balance.ts';
import { STRINGS } from './config/strings.ts';
import { GAME_HEIGHT, GAME_WIDTH } from './config/visuals.ts';
import { Emitter } from './core/emitter.ts';
import { GameModel } from './core/GameModel.ts';
import { floorConfig } from './core/levels.ts';
import { SaveManager, type StorageLike } from './core/save.ts';
import { BootScene } from './scenes/BootScene.ts';
import type { GameContext, UiEvents } from './scenes/context.ts';
import { GameScene } from './scenes/GameScene.ts';
import { UIScene } from './scenes/UIScene.ts';

function getStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null; // Algunos navegadores bloquean el acceso (cookies deshabilitadas).
  }
}

/** Espera la fuente (con tope) para que los textos no se dibujen con la de respaldo. */
async function waitForFonts(timeoutMs: number): Promise<void> {
  const fonts = Promise.all(['500', '600', '700'].map((weight) => document.fonts.load(`${weight} 48px "Fredoka"`)));
  await Promise.race([fonts.catch(() => undefined), new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
}

async function start(): Promise<void> {
  const saves = new SaveManager(getStorage());
  const model = new GameModel(saves.load() ?? undefined);
  const ui = new Emitter<UiEvents>();
  let warnedSaveFailure = false;

  const ctx: GameContext = {
    model,
    ui,
    saveNow: () => {
      if (saves.save(model.state) || warnedSaveFailure) return;
      warnedSaveFailure = true;
      ui.emit('toast', { text: STRINGS.saveFailed });
    },
    resetGame: () => {
      model.reset();
      ctx.saveNow();
    },
  };

  document.title = STRINGS.title;
  const pageColor = floorConfig(0).pageColor;
  document.body.style.backgroundColor = pageColor;
  await waitForFonts(2000);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: pageColor,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    disableContextMenu: true,
    scene: [new BootScene(), new GameScene(ctx), new UIScene(ctx)],
  });

  // Autoguardado, y también al ocultar o cerrar la pestaña (en celulares `pagehide` es lo confiable).
  window.setInterval(ctx.saveNow, BALANCE.AUTOSAVE_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') ctx.saveNow();
  });
  window.addEventListener('pagehide', ctx.saveNow);
  window.addEventListener('beforeunload', ctx.saveNow);

  if (import.meta.env.DEV) {
    const { installDebugHooks } = await import('./debug.ts');
    installDebugHooks(game, model, () => saves.clear());
  }
}

void start();
