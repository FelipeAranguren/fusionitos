import { FLOORS } from '../config/creatures.ts';
import { LAYOUT } from '../config/visuals.ts';

// La barra de pestañas muestra `visible` pisos seguidos de los `total`; esto decide cuáles.
// Sin Phaser, para poder testearlo.

/**
 * Primer piso a la vista: el piso que se ve queda en el centro y, si entra junto a él,
 * también el piso donde caen los huevos (jugando en el piso más alto, quedan los dos y el próximo a abrir).
 */
export function tabWindowStart(
  current: number,
  eggFloor: number,
  total: number = FLOORS.length,
  visible: number = LAYOUT.tabs.visible,
): number {
  let first = current - Math.floor(visible / 2);
  if (Math.abs(current - eggFloor) < visible) {
    if (eggFloor < first) first = eggFloor;
    else if (eggFloor >= first + visible) first = eggFloor - visible + 1;
  }
  return clampStart(first, total, visible);
}

/** Corre la ventana una página hacia un lado, sin pasarse de los extremos. */
export function pageTabWindow(
  first: number,
  direction: -1 | 1,
  total: number = FLOORS.length,
  visible: number = LAYOUT.tabs.visible,
): number {
  return clampStart(first + direction * visible, total, visible);
}

function clampStart(first: number, total: number, visible: number): number {
  return Math.min(Math.max(first, 0), Math.max(0, total - visible));
}
