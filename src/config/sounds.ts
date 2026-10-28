/**
 * Efectos de sonido, sintetizados en el navegador con Web Audio (no hay archivos de audio).
 * Cada sonido es una lista de capas: un tono (que puede deslizarse), un arpegio o un ruido filtrado.
 * Las alturas se escriben en Hz o como nota ("C5"); los tiempos, en segundos.
 */

export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth';

export interface ToneLayer {
  readonly wave: Wave;
  readonly pitch: number | string;
  /** Si está, el tono se desliza hasta acá durante la capa. */
  readonly pitchEnd?: number | string;
  /** Desde el comienzo del sonido. */
  readonly start?: number;
  readonly duration: number;
  readonly volume: number;
  readonly attack?: number;
}

export interface ArpeggioLayer {
  readonly wave: Wave;
  readonly notes: readonly string[];
  /** Separación entre notas. */
  readonly spacing: number;
  readonly noteDuration: number;
  readonly start?: number;
  readonly volume: number;
  readonly attack?: number;
}

export interface NoiseLayer {
  readonly wave: 'noise';
  readonly start?: number;
  readonly duration: number;
  readonly volume: number;
  readonly attack?: number;
  readonly filter?: {
    readonly type: 'lowpass' | 'highpass' | 'bandpass';
    readonly freq: number;
    readonly freqEnd?: number;
    readonly q?: number;
  };
}

export type SoundLayer = ToneLayer | ArpeggioLayer | NoiseLayer;

export interface SoundRecipe {
  readonly layers: readonly SoundLayer[];
  /** Variación de tono al azar (± semitonos), para que repetido no canse. */
  readonly jitter?: number;
  /** Mínimo entre dos reproducciones, para los que pueden sonar muy seguido. */
  readonly minGapMs?: number;
}

/** Mezcla general (0..1). La música va bajita: acompaña, no tapa. */
export const AUDIO_MIX = {
  /** Va más bajo de lo que parece: el limitador suma ~1.7 dB de compensación automática. */
  master: 0.55,
  sfx: 0.6,
  music: 0.3,
  /** Constante de tiempo del fundido al prender o apagar la música. */
  musicFadeSeconds: 0.25,
  /**
   * Corte de graves de toda la salida. Los parlantes de celular y notebook no reproducen
   * frecuencias tan bajas: si les llegan, el cono hace tope y suena a chasquido o saturación.
   */
  lowCutHz: 120,
  /**
   * Limitador de la salida: red de seguridad para cuando se juntan muchos sonidos (comprime en vez de recortar).
   * Umbral alto a propósito: el compresor de Web Audio sube el volumen general en proporción a lo que
   * comprime, y con un umbral bajo terminaba sonando más fuerte.
   */
  limiter: { thresholdDb: -3, kneeDb: 3, ratio: 20 },
} as const;

export const SOUNDS = {
  /** Botones. */
  click: { layers: [{ wave: 'triangle', pitch: 1100, pitchEnd: 750, duration: 0.05, volume: 0.22 }] },
  /** Algo que no se puede: botón gris, piso bloqueado, merge rechazado. */
  denied: {
    layers: [
      { wave: 'triangle', pitch: 300, pitchEnd: 220, duration: 0.12, volume: 0.16 },
      { wave: 'triangle', pitch: 230, pitchEnd: 160, start: 0.1, duration: 0.16, volume: 0.16 },
    ],
  },
  pickUp: { layers: [{ wave: 'sine', pitch: 'C5', pitchEnd: 'G5', duration: 0.08, volume: 0.26 }] },
  drop: { layers: [{ wave: 'sine', pitch: 'G4', pitchEnd: 'C4', duration: 0.09, volume: 0.22 }] },
  /** Golpe suave: arriba de los graves que los parlantes chicos no reproducen. */
  eggLand: {
    jitter: 1.5,
    layers: [
      { wave: 'sine', pitch: 260, pitchEnd: 140, duration: 0.13, volume: 0.3, attack: 0.006 },
      { wave: 'noise', duration: 0.04, volume: 0.06, filter: { type: 'lowpass', freq: 1500 } },
    ],
  },
  eggCrack: {
    layers: [
      { wave: 'noise', duration: 0.05, volume: 0.28, filter: { type: 'highpass', freq: 2200 } },
      { wave: 'noise', start: 0.06, duration: 0.05, volume: 0.22, filter: { type: 'bandpass', freq: 3400, q: 2 } },
      { wave: 'noise', start: 0.12, duration: 0.04, volume: 0.16, filter: { type: 'highpass', freq: 2800 } },
    ],
  },
  /** Aparece una criatura (de un huevo o comprada). */
  hatchPop: {
    jitter: 1,
    layers: [
      { wave: 'sine', pitch: 'C5', pitchEnd: 'C6', duration: 0.12, volume: 0.3 },
      { wave: 'triangle', pitch: 'G6', start: 0.09, duration: 0.12, volume: 0.09 },
    ],
  },
  /** Fusión en el mismo piso. Se transpone según el tier: cuanto más alto, más agudo. */
  merge: {
    layers: [
      { wave: 'triangle', notes: ['C5', 'E5', 'G5'], spacing: 0.06, noteDuration: 0.12, volume: 0.24 },
      { wave: 'sine', pitch: 'C6', start: 0.18, duration: 0.32, volume: 0.16 },
      { wave: 'noise', start: 0.04, duration: 0.25, volume: 0.04, filter: { type: 'highpass', freq: 6000 } },
    ],
  },
  /** Fusión que sube al piso de arriba. */
  levelUp: {
    layers: [
      { wave: 'triangle', notes: ['C5', 'E5', 'G5', 'C6', 'E6'], spacing: 0.07, noteDuration: 0.14, volume: 0.22 },
      { wave: 'sine', pitch: 'G6', start: 0.35, duration: 0.5, volume: 0.12 },
      { wave: 'noise', start: 0.3, duration: 0.4, volume: 0.04, filter: { type: 'highpass', freq: 7000 } },
    ],
  },
  /**
   * Pulso de monedas: suena muy seguido, por eso es bajito, redondo (ataque suave, nada de clic seco),
   * con variación de tono y un mínimo entre dos.
   */
  coin: {
    jitter: 2,
    minGapMs: 220,
    layers: [
      { wave: 'sine', pitch: 'E6', duration: 0.12, volume: 0.04, attack: 0.012 },
      { wave: 'sine', pitch: 'B6', start: 0.06, duration: 0.16, volume: 0.03, attack: 0.012 },
    ],
  },
  purchase: {
    layers: [
      { wave: 'triangle', pitch: 'B5', duration: 0.07, volume: 0.2 },
      { wave: 'triangle', pitch: 'E6', start: 0.07, duration: 0.24, volume: 0.2 },
      { wave: 'noise', start: 0.07, duration: 0.12, volume: 0.05, filter: { type: 'highpass', freq: 5000 } },
    ],
  },
  /** Popup de criatura nueva. */
  discover: {
    layers: [
      { wave: 'triangle', notes: ['G5', 'C6', 'E6'], spacing: 0.1, noteDuration: 0.16, volume: 0.2 },
      { wave: 'triangle', pitch: 'G6', start: 0.3, duration: 0.55, volume: 0.18 },
      { wave: 'sine', pitch: 'C6', start: 0.3, duration: 0.55, volume: 0.1 },
    ],
  },
  /** Bienvenida con ingreso offline: cascada de monedas. */
  welcome: {
    layers: [
      { wave: 'sine', notes: ['E6', 'G6', 'B6', 'E7', 'G7'], spacing: 0.07, noteDuration: 0.1, volume: 0.07 },
      { wave: 'triangle', notes: ['C5', 'E5', 'G5', 'C6'], spacing: 0.09, noteDuration: 0.18, volume: 0.16 },
    ],
  },
  /** Cambio de piso. */
  whoosh: {
    layers: [
      { wave: 'noise', duration: 0.24, volume: 0.12, attack: 0.08, filter: { type: 'bandpass', freq: 400, freqEnd: 2600, q: 1.2 } },
    ],
  },
} as const satisfies Record<string, SoundRecipe>;

export type SoundName = keyof typeof SOUNDS;
