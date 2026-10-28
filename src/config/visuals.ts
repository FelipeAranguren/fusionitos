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
  /** Pestañas de pisos, al pie. */
  tabs: { top: 1668, height: 160, marginX: 24, gap: 12, radius: 34 },
  hintY: 1876,
} as const;

/** Íconos de la interfaz que se generan desde emojis (los de criaturas están en creatures.ts). */
export const ICONS = {
  lock: '🔒',
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
  card: 0xfff8ec,
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
