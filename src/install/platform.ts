// Cuándo ofrecer el acceso directo y qué pasos explicar. Sin DOM, para poder testearlo.

/** Para qué sistema se explican los pasos de "agregar a inicio". */
export type InstallPlatform = 'ios' | 'android' | 'other';

export function installPlatform(userAgent: string, maxTouchPoints: number): InstallPlatform {
  // El iPad se presenta como una Mac: se lo reconoce por la pantalla táctil.
  if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  return 'other';
}

export interface InstallSituation {
  /** El juego ya está abierto como app, desde el acceso directo. */
  standalone: boolean;
  /** El navegador avisó que se puede instalar: el botón abre su diálogo. */
  canPrompt: boolean;
  /** Ya se instaló desde este navegador. */
  installedBefore: boolean;
  platform: InstallPlatform;
}

/**
 * Si se muestra el botón de acceso directo. Con el diálogo del navegador, siempre; sin él, solo en
 * celulares (ahí el botón explica los pasos) y si todavía no se instaló.
 */
export function showInstallButton({ standalone, canPrompt, installedBefore, platform }: InstallSituation): boolean {
  if (standalone) return false;
  if (canPrompt) return true;
  return !installedBefore && platform !== 'other';
}
