import { FLOORS } from '../config/creatures.ts';
import { LAYOUT, TAB_SCROLL } from '../config/visuals.ts';

// La barra de pestañas muestra `visible` pisos seguidos de los `total`; esto decide cuáles.
// Las posiciones son el primer piso a la vista (fraccionario mientras la barra se mueve).
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
  return clampTabStart(first, total, visible);
}

/** Corre la ventana una página hacia un lado, sin pasarse de los extremos. */
export function pageTabWindow(
  first: number,
  direction: -1 | 1,
  total: number = FLOORS.length,
  visible: number = LAYOUT.tabs.visible,
): number {
  return clampTabStart(first + direction * visible, total, visible);
}

/** Último primer piso posible: al final de la barra no quedan lugares vacíos. */
export function lastTabStart(total: number = FLOORS.length, visible: number = LAYOUT.tabs.visible): number {
  return Math.max(0, total - visible);
}

export function clampTabStart(first: number, total: number = FLOORS.length, visible: number = LAYOUT.tabs.visible): number {
  return Math.min(Math.max(first, 0), lastTabStart(total, visible));
}

/**
 * Posición mientras se arrastra la barra: sigue al dedo, y pasado un extremo se resiste
 * (avanza solo `overscroll` de lo que se mueve el dedo), como las listas del celular.
 */
export function dragTabPosition(
  position: number,
  total: number = FLOORS.length,
  visible: number = LAYOUT.tabs.visible,
  overscroll: number = TAB_SCROLL.overscroll,
): number {
  const last = lastTabStart(total, visible);
  if (position < 0) return position * overscroll;
  if (position > last) return last + (position - last) * overscroll;
  return position;
}

/**
 * Dónde se acomoda la barra al soltarla: avanza con el impulso del dedo (`velocity`, en pestañas
 * por ms) y se redondea a una pestaña entera, sin pasarse de los extremos.
 */
export function settleTabPosition(
  position: number,
  velocity: number,
  total: number = FLOORS.length,
  visible: number = LAYOUT.tabs.visible,
  flingMs: number = TAB_SCROLL.flingMs,
): number {
  return clampTabStart(Math.round(position + velocity * flingMs), total, visible);
}
