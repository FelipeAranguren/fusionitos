import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import Phaser from 'phaser';
import { openAccount } from './account/openAccount.ts';
import { withTimeout } from './account/withTimeout.ts';
import { AudioEngine } from './audio/AudioEngine.ts';
import { BALANCE } from './config/balance.ts';
import { CLOUD_SAVE } from './config/cloud.ts';
import { STRINGS } from './config/strings.ts';
import { GAME_HEIGHT, GAME_WIDTH } from './config/visuals.ts';
import { Emitter } from './core/emitter.ts';
import { GameModel } from './core/GameModel.ts';
import { floorConfig } from './core/levels.ts';
import { InstallPrompt } from './install/InstallPrompt.ts';
import { serializeSave, type StorageLike } from './core/save.ts';
import { BootScene } from './scenes/BootScene.ts';
import type { GameContext, UiEvents, ViewState } from './scenes/context.ts';
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
  const storage = getStorage();
  // Lo antes posible: el aviso de que se puede instalar llega una sola vez, al cargar.
  const install = new InstallPrompt(storage);
  const audio = new AudioEngine(storage);
  document.title = STRINGS.title;

  // Se deja de guardar si otra apertura del juego tomó la partida (y entonces se pide recargar) o al cerrar sesión.
  let stopped = false;
  const account = await openAccount(storage, () => {
    stopped = true;
    const { takenOverTitle, takenOverBody, reload } = STRINGS.account;
    void account.screen.showMessage(takenOverTitle, takenOverBody, reload, true).then(() => window.location.reload());
  });
  const { saves, cloud } = account;
  const model = new GameModel(account.loaded?.state);
  const ui = new Emitter<UiEvents>();
  // Se abre en el piso más alto desbloqueado, que es donde avanza la partida.
  const view: ViewState = { floor: model.highestUnlockedFloor, welcome: null };
  let warnedSaveFailure = false;
  // Con la pestaña oculta el juego está en pausa: el guardado queda fechado en el momento en que se ocultó,
  // así el ingreso offline cuenta toda la ausencia aunque después se cierre la pestaña.
  let hiddenSince: number | null = null;
  const snapshot = (): string => serializeSave(model.state, hiddenSince ?? Date.now());
  const pushToCloud = (): void => {
    if (!stopped) void cloud.push(snapshot);
  };

  const ctx: GameContext = {
    model,
    ui,
    view,
    audio,
    install,
    account: {
      email: account.email,
      cloudStatus: () => cloud.status,
      signOut: () => {
        if (stopped) return;
        ctx.saveNow();
        stopped = true;
        account.screen.showLoading(STRINGS.account.savingBeforeSignOut, true);
        void withTimeout(cloud.push(snapshot), CLOUD_SAVE.timeoutMs)
          .catch(() => undefined) // Sin conexión queda la copia de este dispositivo.
          .then(() => account.signOut())
          .finally(() => window.location.reload());
      },
    },
    saveNow: () => {
      if (stopped || saves.save(model.state, hiddenSince ?? Date.now()) || warnedSaveFailure) return;
      warnedSaveFailure = true;
      ui.emit('toast', { text: STRINGS.saveFailed });
    },
    resetGame: () => {
      model.reset();
      ctx.saveNow();
      pushToCloud();
    },
  };

  /** Ingreso offline de una ausencia; si corresponde, la UIScene muestra la bienvenida. */
  const welcomeBack = (awayMs: number): void => {
    const earnings = model.applyOfflineEarnings(awayMs);
    if (earnings) view.welcome = earnings;
  };
  if (account.loaded) welcomeBack(Date.now() - account.loaded.savedAt);
  // La partida queda ya en el dispositivo y en la nube tal como arranca (si era la del dispositivo, ahora es de la cuenta).
  ctx.saveNow();
  if (account.cloudReachable) void cloud.claim(snapshot());

  const pageColor = floorConfig(view.floor).pageColor;
  document.body.style.backgroundColor = pageColor;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', pageColor);
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
    // El sonido lo maneja AudioEngine; el de Phaser no se usa.
    audio: { noAudio: true },
    scene: [new BootScene(), new GameScene(ctx), new UIScene(ctx)],
  });

  // Los navegadores solo dejan arrancar el audio con un gesto del usuario (en iOS, `touchend`).
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) {
    window.addEventListener(type, () => audio.unlock(), { passive: true });
  }

  // Autoguardado, y también al ocultar o cerrar la pestaña (en celulares `pagehide` es lo confiable).
  window.setInterval(ctx.saveNow, BALANCE.AUTOSAVE_INTERVAL_MS);
  // A la nube se sube cada tanto mientras se juega: con la pestaña oculta la partida no cambia.
  window.setInterval(() => {
    if (document.visibilityState === 'visible') pushToCloud();
  }, CLOUD_SAVE.intervalMs);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenSince ??= Date.now();
      ctx.saveNow();
      pushToCloud();
      audio.pause();
    } else if (hiddenSince !== null) {
      const awayMs = Date.now() - hiddenSince;
      hiddenSince = null;
      audio.resume();
      welcomeBack(awayMs);
      // De paso se entera enseguida si mientras tanto la partida se abrió en otro lado.
      pushToCloud();
    }
  });
  window.addEventListener('pagehide', () => {
    ctx.saveNow();
    pushToCloud();
  });
  window.addEventListener('beforeunload', ctx.saveNow);

  if (import.meta.env.DEV) {
    const { installDebugHooks } = await import('./debug.ts');
    installDebugHooks(game, ctx, {
      clearSave: () => saves.clear(),
      simulateAway: welcomeBack,
      audio,
      account: () => ({ email: account.email, session: cloud.session, ...cloud.status }),
      pushCloud: () => cloud.push(snapshot),
    });
  }
}

void start();
