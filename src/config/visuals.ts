/**
 * Constantes visuales (no de balance): layout, tamaños, velocidades y duraciones.
 * Todo en píxeles lógicos de la resolución base 1080×1920 (Phaser escala con FIT).
 */

export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

export const LAYOUT = {
  hud: { x: 24, y: 24, width: 1032, height: 250 },
  field: { x: 36, y: 300, width: 1008, height: 1350 },
  /** Margen interior del campo para el centro de las entidades (deja lugar al cuerpo y la sombra). */
  fieldInset: { left: 100, right: 100, top: 110, bottom: 90 },
  fieldRadius: 56,
  /** Sobre el borde superior del campo: así no tapa lo que está arriba del campo. */
  bannerY: 300,
  toastY: 1580,
  /** Pestañas de pisos, al pie: se ven `visible` a la vez; la barra se desliza y tiene flechas a los costados. */
  tabs: { top: 1668, height: 160, marginX: 16, gap: 10, radius: 34, visible: 5, arrowWidth: 84 },
  /** Última línea: la pista a la izquierda y el botón de reiniciar a la derecha. */
  hintX: 44,
  hintY: 1876,
  resetButton: { x: 946, width: 220, height: 64 },
  /** Botones redondos para silenciar efectos y música, entre la pista y "Reiniciar". */
  audioToggles: { sfxX: 690, musicX: 772, size: 72, hitPadding: 20 },
} as const;

/** Íconos de la interfaz que se generan desde emojis (los de criaturas están en creatures.ts). */
export const ICONS = {
  lock: '🔒',
  shop: '🛒',
  sound: '🔊',
  music: '🎵',
} as const;

export const SIZES = {
  creature: 170,
  egg: 130,
  /** Resolución a la que se rasteriza cada emoji (después se escala a `creature`/`egg`). */
  emojiTexture: 256,
  /** Borde blanco tipo sticker alrededor de los emojis, en px de la textura. */
  emojiOutline: 7,
  /** Distancia máxima (centro a centro) para que soltar sobre otra criatura cuente como destino. */
  dropRadius: 125,
  decor: 84,
  decorCount: 16,
  decorAlpha: 0.35,
} as const;

export const WANDER = {
  /** px/s */
  speed: 45,
  minStep: 60,
  maxStep: 220,
  minPauseMs: 700,
  maxPauseMs: 2600,
  hopHeight: 12,
  hopMs: 170,
} as const;

export const ANIM = {
  eggDropHeight: 520,
  eggDropMs: 850,
  hatchShakeMs: 70,
  hatchPopMs: 360,
  spawnPopMs: 420,
  mergeMoveMs: 140,
  mergeShrinkMs: 170,
  dragScale: 1.18,
  coinTextMs: 1150,
  coinTextRise: 110,
  /** Espera antes del popup de descubrimiento, para que se vea la animación que lo causó. */
  discoveryDelayMs: 650,
  toastMs: 2300,
  /** Fundido del campo al cambiar de piso (cada mitad). */
  floorFadeMs: 140,
} as const;

/** Deslizamiento de la barra de pestañas. Las posiciones se miden en pestañas. */
export const TAB_SCROLL = {
  /** px que se mueve el dedo antes de que el toque pase a ser arrastre. */
  dragThreshold: 24,
  /** Pasado un extremo, la barra sigue al dedo solo en esta proporción. */
  overscroll: 0.35,
  /** Impulso al soltar: la barra avanza lo que el dedo recorrería, a su velocidad, en este tiempo. */
  flingMs: 250,
  /** La velocidad del dedo se mide con sus movimientos de los últimos ms. */
  velocityWindowMs: 100,
  /** Duración del acomodo (al soltar, con las flechas o al cambiar de piso). */
  snapMs: 320,
  /** Giro de la rueda del mouse que corre una pestaña. */
  wheelStep: 100,
} as const;

export const DEPTH = {
  dragged: 10_000,
  effects: 11_000,
  floatingText: 12_000,
} as const;

export const COLORS = {
  hudPanel: 0x000000,
  hudPanelAlpha: 0.28,
  barBg: 0x000000,
  barBgAlpha: 0.32,
  barFill: 0xffd54a,
  barFull: 0xff6b5b,
  danger: 0xe5533d,
  primary: 0x4cae4c,
  neutral: 0x8a94a6,
  disabled: 0xb3aca0,
  card: 0xfff8ec,
  cardRow: 0xf3e7d3,
  dim: 0x000000,
  dimAlpha: 0.6,
  shadow: 0x000000,
  shadowAlpha: 0.22,
  highlightMatch: 0xffffff,
  highlightTarget: 0xffe14d,
  textLight: '#ffffff',
  textDark: '#3b2f22',
  textMuted: '#7a6a55',
  textCoin: '#ffe27a',
  stroke: '#2a2a1f',
} as const;

export const FONT_FAMILY = '"Fredoka", "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const EMOJI_FONT_FAMILY =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';
