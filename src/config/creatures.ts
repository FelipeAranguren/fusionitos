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
  /** Nombre corto: entra en la pestaña. */
  readonly name: string;
  /** Color del campo. */
  readonly fieldColor: number;
  /** Color de acento: borde del campo, resaltados y partículas. */
  readonly accentColor: number;
  /** Color de fondo alrededor del campo (y de la página en escritorio). */
  readonly pageColor: string;
  /** Emojis decorativos que se dibujan tenues sobre el campo (nunca los de una criatura). */
  readonly decor: readonly string[];
  /** Opacidad de la decoración, si el fondo pide otra (en fondos oscuros, más). */
  readonly decorAlpha?: number;
  /** Exactamente BALANCE.CREATURES_PER_FLOOR criaturas, de tier 1 a 6. */
  readonly creatures: readonly CreatureConfig[];
}

export const EGG: { readonly emoji: string; readonly image?: string } = { emoji: '🥚' };

/** 20 pisos: de la naturaleza cercana a lo exótico, después lo fantástico y al final el espacio. */
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
    decor: ['⚓', '🌿'],
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
    name: 'Pantano',
    fieldColor: 0x8aa564,
    accentColor: 0x4d6630,
    pageColor: '#1d2a14',
    decor: ['🍃', '💧'],
    creatures: [
      { name: 'Mosquito', emoji: '🦟' },
      { name: 'Rana', emoji: '🐸' },
      { name: 'Lagartija', emoji: '🦎' },
      { name: 'Tortuga', emoji: '🐢' },
      { name: 'Hipopótamo', emoji: '🦛' },
      { name: 'Cocodrilo', emoji: '🐊' },
    ],
  },
  {
    name: 'Ciudad',
    fieldColor: 0xb8c0cc,
    accentColor: 0x6b7686,
    pageColor: '#222831',
    decor: ['🧱', '🚲'],
    creatures: [
      { name: 'Rata', emoji: '🐀' },
      { name: 'Gorrión', emoji: '🐦' },
      { name: 'Mapache', emoji: '🦝' },
      { name: 'Gato', emoji: '🐈' },
      { name: 'Perro', emoji: '🐕' },
      { name: 'Caniche', emoji: '🐩' },
    ],
  },
  {
    name: 'Lago',
    fieldColor: 0x7fd3c8,
    accentColor: 0x2f8f86,
    pageColor: '#0f3b38',
    decor: ['🪨', '💧'],
    creatures: [
      { name: 'Trucha', emoji: '🐟' },
      { name: 'Pato', emoji: '🦆' },
      { name: 'Nutria', emoji: '🦦' },
      { name: 'Castor', emoji: '🦫' },
      { name: 'Cisne', emoji: '🦢' },
      { name: 'Flamenco', emoji: '🦩' },
    ],
  },
  {
    name: 'Pradera',
    fieldColor: 0xc5e58a,
    accentColor: 0x7aa63a,
    pageColor: '#2c3d14',
    decor: ['🌾', '🌷'],
    creatures: [
      { name: 'Ratón', emoji: '🐁' },
      { name: 'Hámster', emoji: '🐹' },
      { name: 'Pavo', emoji: '🦃' },
      { name: 'Jabalí', emoji: '🐗' },
      { name: 'Búfalo', emoji: '🐃' },
      { name: 'Mustang', emoji: '🐎' },
    ],
  },
  {
    name: 'Desierto',
    fieldColor: 0xf0c27b,
    accentColor: 0xc07a2c,
    pageColor: '#4a2c10',
    decor: ['🌵', '🪨'],
    creatures: [
      { name: 'Escarabajo', emoji: '🪲' },
      { name: 'Escorpión', emoji: '🦂' },
      { name: 'Serpiente', emoji: '🐍' },
      { name: 'Fénec', emoji: '🦊' },
      { name: 'Dromedario', emoji: '🐪' },
      { name: 'Camello', emoji: '🐫' },
    ],
  },
  {
    name: 'Sabana',
    fieldColor: 0xe0b05a,
    accentColor: 0xa86d1f,
    pageColor: '#3d2a0c',
    decor: ['🌳', '🍂'],
    creatures: [
      { name: 'Cebra', emoji: '🦓' },
      { name: 'Jirafa', emoji: '🦒' },
      { name: 'Leopardo', emoji: '🐆' },
      { name: 'Rinoceronte', emoji: '🦏' },
      { name: 'Elefante', emoji: '🐘' },
      { name: 'León', emoji: '🦁' },
    ],
  },
  {
    name: 'Selva',
    fieldColor: 0x4f9e5a,
    accentColor: 0x1f6b3a,
    pageColor: '#0d2b17',
    decor: ['🌴', '🌺'],
    creatures: [
      { name: 'Loro', emoji: '🦜' },
      { name: 'Mono', emoji: '🐒' },
      { name: 'Perezoso', emoji: '🦥' },
      { name: 'Tigre', emoji: '🐅' },
      { name: 'Orangután', emoji: '🦧' },
      { name: 'Gorila', emoji: '🦍' },
    ],
  },
  {
    name: 'Montaña',
    fieldColor: 0x9fb4c7,
    accentColor: 0x5a7088,
    pageColor: '#1e2833',
    decor: ['🪨', '🌲', '❄️'],
    creatures: [
      { name: 'Cabra', emoji: '🐐' },
      { name: 'Carnero', emoji: '🐏' },
      { name: 'Llama', emoji: '🦙' },
      { name: 'Yak', emoji: '🐂' },
      { name: 'Bisonte', emoji: '🦬' },
      { name: 'Cóndor', emoji: '🦅' },
    ],
  },
  {
    name: 'Polo',
    fieldColor: 0xcfe9fb,
    accentColor: 0x7fb8d8,
    pageColor: '#16324a',
    decor: ['❄️', '🧊'],
    creatures: [
      { name: 'Pingüino', emoji: '🐧' },
      { name: 'Foca', emoji: '🦭' },
      { name: 'Lobo ártico', emoji: '🐺' },
      { name: 'Orca', emoji: '🐳' },
      { name: 'Muñeco de nieve', emoji: '☃️' },
      { name: 'Mamut', emoji: '🦣' },
    ],
  },
  {
    name: 'Noche',
    fieldColor: 0x2e3a6b,
    accentColor: 0x8a9ae8,
    pageColor: '#0b1026',
    decor: ['⭐', '✨'],
    decorAlpha: 0.6,
    creatures: [
      { name: 'Grillo', emoji: '🦗' },
      { name: 'Araña', emoji: '🕷️' },
      { name: 'Zorrillo', emoji: '🦨' },
      { name: 'Murciélago', emoji: '🦇' },
      { name: 'Luna nueva', emoji: '🌚' },
      { name: 'Luna llena', emoji: '🌝' },
    ],
  },
  {
    name: 'Prehistoria',
    fieldColor: 0xc98b5a,
    accentColor: 0x8a4f22,
    pageColor: '#3a1f0d',
    decor: ['🦴', '🪨'],
    creatures: [
      { name: 'Lombriz', emoji: '🪱' },
      { name: 'Trilobite', emoji: '🦐' },
      { name: 'Amonite', emoji: '🐚' },
      { name: 'Dodo', emoji: '🦤' },
      { name: 'Saurópodo', emoji: '🦕' },
      { name: 'Tiranosaurio', emoji: '🦖' },
    ],
  },
  {
    name: 'Abismo',
    fieldColor: 0x1f4f7a,
    accentColor: 0x4fb3e0,
    pageColor: '#061726',
    decor: ['💎', '🌿'],
    decorAlpha: 0.55,
    creatures: [
      { name: 'Ostra', emoji: '🦪' },
      { name: 'Pez globo', emoji: '🐡' },
      { name: 'Langosta', emoji: '🦞' },
      { name: 'Calamar gigante', emoji: '🦑' },
      { name: 'Sirena', emoji: '🧜' },
      { name: 'Leviatán', emoji: '🐉' },
    ],
  },
  {
    name: 'Mansión',
    fieldColor: 0x5a4a6b,
    accentColor: 0xc28a3d,
    pageColor: '#1a1320',
    decor: ['🕸️', '🕯️'],
    decorAlpha: 0.55,
    creatures: [
      { name: 'Calabaza', emoji: '🎃' },
      { name: 'Fantasma', emoji: '👻' },
      { name: 'Calavera', emoji: '💀' },
      { name: 'Zombi', emoji: '🧟' },
      { name: 'Vampiro', emoji: '🧛' },
      { name: 'Bruja', emoji: '🧙' },
    ],
  },
  {
    name: 'Reino mágico',
    fieldColor: 0xf3b6e0,
    accentColor: 0xb050a0,
    pageColor: '#3a1636',
    decor: ['✨', '🍄', '🌈'],
    creatures: [
      { name: 'Hada', emoji: '🧚' },
      { name: 'Elfo', emoji: '🧝' },
      { name: 'Ogro', emoji: '👹' },
      { name: 'Genio', emoji: '🧞' },
      { name: 'Unicornio', emoji: '🦄' },
      { name: 'Dragón', emoji: '🐲' },
    ],
  },
  {
    name: 'Juguetería',
    fieldColor: 0xffd166,
    accentColor: 0xef476f,
    pageColor: '#3b2a3f',
    decor: ['🎈', '🧩'],
    creatures: [
      { name: 'Osito', emoji: '🧸' },
      { name: 'Caballito', emoji: '🐴' },
      { name: 'Matrioska', emoji: '🪆' },
      { name: 'Payaso', emoji: '🤡' },
      { name: 'Pixelito', emoji: '👾' },
      { name: 'Robot', emoji: '🤖' },
    ],
  },
  {
    name: 'Galaxia',
    fieldColor: 0x4a3a85,
    accentColor: 0xb39dff,
    pageColor: '#120b29',
    decor: ['💫', '✨', '🌙'],
    decorAlpha: 0.6,
    creatures: [
      { name: 'Alien', emoji: '👽' },
      { name: 'Platillo volador', emoji: '🛸' },
      { name: 'Cometa', emoji: '☄️' },
      { name: 'Planeta viviente', emoji: '🪐' },
      { name: 'Sol viviente', emoji: '🌞' },
      { name: 'Supernova', emoji: '🌟' },
    ],
  },
];
