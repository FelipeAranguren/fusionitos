import type { StorageLike } from '../core/save.ts';
import { type InstallPlatform, installPlatform, showInstallButton } from './platform.ts';

/** Se recuerda que el juego se instaló, para no seguir ofreciéndolo en el navegador. */
export const INSTALLED_KEY = 'fusionitos.installed';

/** El aviso de que la página se puede instalar (Chrome, Edge, Samsung Internet); no está en los tipos del DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

/**
 * Acceso directo: instalar el juego como app. Cuando el navegador avisa que se puede, se guarda el
 * aviso para abrir su diálogo desde el botón del juego. Donde no avisa (Safari, o Chrome abierto
 * desde otra app), el botón explica los pasos.
 */
export class InstallPrompt {
  readonly platform: InstallPlatform;
  private readonly storage: StorageLike | null;
  private readonly standalone: boolean;
  private deferred: BeforeInstallPromptEvent | null = null;
  private installedBefore: boolean;

  constructor(storage: StorageLike | null) {
    this.storage = storage;
    this.platform = installPlatform(navigator.userAgent, navigator.maxTouchPoints);
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    this.standalone = window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
    this.installedBefore = this.readInstalled();
    window.addEventListener('beforeinstallprompt', (event) => {
      // Sin el cartel automático del navegador: se instala desde el botón del juego.
      event.preventDefault();
      this.deferred = event as BeforeInstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.installedBefore = true;
      try {
        this.storage?.setItem(INSTALLED_KEY, '1');
      } catch {
        // Sin storage, el botón vuelve a aparecer la próxima vez; no es grave.
      }
    });
  }

  /** Si hay que mostrar el botón de acceso directo. */
  get available(): boolean {
    return showInstallButton({
      standalone: this.standalone,
      canPrompt: this.deferred !== null,
      installedBefore: this.installedBefore,
      platform: this.platform,
    });
  }

  /** Abre el diálogo de instalación del navegador. Devuelve false si no lo hay: hay que explicar los pasos. */
  async prompt(): Promise<boolean> {
    const event = this.deferred;
    if (!event) return false;
    // Cada aviso sirve una sola vez; si se cancela, el navegador vuelve a avisar más adelante.
    this.deferred = null;
    await event.prompt();
    return true;
  }

  private readInstalled(): boolean {
    try {
      return this.storage?.getItem(INSTALLED_KEY) === '1';
    } catch {
      return false;
    }
  }
}
