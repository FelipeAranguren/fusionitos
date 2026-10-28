/**
 * Catálogo de pisos y criaturas (GAME_DESIGN.md §3).
 *
 * Para reemplazar un emoji por una imagen: poné el archivo en `public/assets/creatures/`
 * y completá `image` (ruta relativa a `public/`). El resto del juego no cambia.
 */

export interface CreatureConfig {
  /** Nombre visible. */
  readonly name: string;
  /** Emoji con el que se genera la textura mientras no haya imagen. */
  readonly emoji: string;
  /** Imagen opcional (ej. 'assets/creatures/oruga.png'); si está, reemplaza al emoji. */
  readonly image?: string;
}

export interface FloorConfig {
  readonly name: string;
  /** Color del campo. */
  readonly fieldColor: number;
  /** Color de acento: borde del campo, resaltados y partículas. */
  readonly accentColor: number;
  /** Color de fondo alrededor del campo (y de la página en escritorio). */
  readonly pageColor: string;
  /** Emojis decorativos que se dibujan tenues sobre el campo. */
  readonly decor: readonly string[];
  /** Opacidad de la decoración, si el fondo pide otra (en fondos oscuros, más). */
  readonly decorAlpha?: number;
  /** Exactamente BALANCE.CREATURES_PER_FLOOR criaturas, de tier 1 a 6. */
  readonly creatures: readonly CreatureConfig[];
}

export const EGG: { readonly emoji: string; readonly image?: string } = { emoji: '🥚' };

export const FLOORS: readonly FloorConfig[] = [
  {
    name: 'Jardín',
    fieldColor: 0xa5d86e,
    accentColor: 0x5b9a32,
    pageColor: '#1f3d1b',
    decor: ['🌼', '🌱', '🍀'],
    creatures: [
      { name: 'Oruga', emoji: '🐛' },
      { name: 'Caracol', emoji: '🐌' },
      { name: 'Hormiga', emoji: '🐜' },
      { name: 'Vaquita', emoji: '🐞' },
      { name: 'Abeja', emoji: '🐝' },
      { name: 'Mariposa', emoji: '🦋' },
    ],
  },
  {
    name: 'Granja',
    fieldColor: 0xf2d58a,
    accentColor: 0xc9962e,
    pageColor: '#4a3714',
    decor: ['🌾', '🌻'],
    creatures: [
      { name: 'Pollito', emoji: '🐣' },
      { name: 'Gallo', emoji: '🐓' },
      { name: 'Conejo', emoji: '🐇' },
      { name: 'Chancho', emoji: '🐖' },
      { name: 'Oveja', emoji: '🐑' },
      { name: 'Vaca', emoji: '🐄' },
    ],
  },
  {
    name: 'Bosque',
    fieldColor: 0x6fa567,
    accentColor: 0x2f6b33,
    pageColor: '#14301a',
    decor: ['🌲', '🍄', '🍂'],
    creatures: [
      { name: 'Erizo', emoji: '🦔' },
      { name: 'Ardilla', emoji: '🐿️' },
      { name: 'Búho', emoji: '🦉' },
      { name: 'Tejón', emoji: '🦡' },
      { name: 'Ciervo', emoji: '🦌' },
      { name: 'Oso', emoji: '🐻' },
    ],
  },
  {
    name: 'Océano',
    fieldColor: 0x5db3e6,
    accentColor: 0x1f6fa8,
    pageColor: '#0e2f4a',
    decor: ['🐚', '🌿'],
    creatures: [
      { name: 'Pez', emoji: '🐠' },
      { name: 'Cangrejo', emoji: '🦀' },
      { name: 'Pulpo', emoji: '🐙' },
      { name: 'Delfín', emoji: '🐬' },
      { name: 'Tiburón', emoji: '🦈' },
      { name: 'Ballena', emoji: '🐋' },
    ],
  },
  {
    name: 'Galaxia',
    fieldColor: 0x4a3a85,
    accentColor: 0xb39dff,
    pageColor: '#120b29',
    decor: ['⭐', '✨', '🌙'],
    decorAlpha: 0.6,
    creatures: [
      { name: 'Bichito cósmico', emoji: '👾' },
      { name: 'Alien', emoji: '👽' },
      { name: 'Unicornio', emoji: '🦄' },
      { name: 'Dragoncito', emoji: '🐲' },
      { name: 'Dragón', emoji: '🐉' },
      { name: 'Sol viviente', emoji: '🌞' },
    ],
  },
];
