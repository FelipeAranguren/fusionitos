import type { Wave } from './sounds.ts';

/**
 * Música de fondo: un loop original de 16 compases (I–vi–IV–V en Do mayor) que se sintetiza en vivo.
 * Melodía: un compás por línea, un token por corchea. Nota ("E5"), "-" sostiene, "." silencio.
 */

export interface Instrument {
  readonly wave: Wave;
  readonly volume: number;
  readonly attack: number;
  /** Cola después de la duración escrita. */
  readonly release: number;
}

export const MUSIC = {
  bpm: 100,
  /** Pasos (corcheas) por compás. */
  stepsPerBar: 8,
  lead: [
    'E5 - G5 - A5 G5 E5 -',
    'C5 - E5 - D5 - C5 -',
    'A4 - C5 - D5 E5 D5 -',
    'D5 - - - G4 - . .',
    'G5 - E5 - G5 A5 G5 -',
    'E5 - C5 - D5 E5 C5 -',
    'A4 C5 D5 - C5 - A4 -',
    'G4 - A4 - B4 - D5 -',
    'E5 - G5 - A5 G5 E5 -',
    'C5 - E5 - D5 - C5 -',
    'A4 - C5 - D5 E5 D5 -',
    'D5 - E5 - D5 - B4 -',
    'C6 - B5 - G5 - E5 -',
    'A5 - G5 - E5 - C5 -',
    'F5 - E5 - D5 - C5 -',
    'D5 - - - . . . .',
  ],
  /** Acorde de cada compás: arma el arpegio y el bajo. */
  chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G'],
  /** Arpegio de cada compás: índices sobre [raíz, tercera, quinta, raíz una octava arriba]. */
  arpPattern: [0, 1, 2, 3, 2, 1, 0, 1],
  arpOctave: 4,
  /**
   * Bajo: en qué paso suena, qué nota del acorde (0 raíz, 1 tercera, 2 quinta), en qué octava y cuántos pasos.
   * Octava 3 (130–220 Hz): más grave satura los parlantes chicos. Por lo mismo, no hay bombo.
   */
  bass: [
    { step: 0, tone: 0, octave: 3, length: 3 },
    { step: 4, tone: 2, octave: 3, length: 2 },
    { step: 6, tone: 0, octave: 3, length: 2 },
  ],
  /** Shaker suave en los contratiempos: lleva el ritmo sin golpes secos. */
  shaker: { steps: [1, 3, 5, 7], volume: 0.025, freq: 6500, duration: 0.06, attack: 0.012 },
  instruments: {
    lead: { wave: 'triangle', volume: 0.17, attack: 0.015, release: 0.12 },
    arp: { wave: 'sine', volume: 0.06, attack: 0.008, release: 0.22 },
    bass: { wave: 'triangle', volume: 0.16, attack: 0.012, release: 0.1 },
  },
  /** Eco sobre la melodía y el arpegio: le da aire. */
  echo: { delaySteps: 1.5, feedback: 0.28, wet: 0.22 },
} as const satisfies {
  instruments: Readonly<Record<'lead' | 'arp' | 'bass', Instrument>>;
  [key: string]: unknown;
};
