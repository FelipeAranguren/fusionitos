/**
 * Notación musical mínima para escribir sonidos y música en la config:
 * notas "C4", "F#3", "Bb5"; compases "E5 - G5 . A5" ("-" sostiene la anterior, "." es silencio).
 */

const NOTE_INDEX: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" → 69 (MIDI). Admite sostenidos y bemoles ("C#4", "Bb3"). */
export function noteToMidi(name: string): number {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!match) throw new Error(`Nota inválida: "${name}"`);
  const [, letter, accidental, octave] = match;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return (Number(octave) + 1) * 12 + NOTE_INDEX[letter] + shift;
}

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Frecuencia en Hz de un número (ya en Hz) o de un nombre de nota. */
export function toHz(pitch: number | string): number {
  return typeof pitch === 'number' ? pitch : midiToHz(noteToMidi(pitch));
}

export interface BarNote {
  /** Paso del compás donde empieza (0..). */
  step: number;
  midi: number;
  /** Duración en pasos. */
  length: number;
}

/** Interpreta un compás. Tiene que tener exactamente `steps` tokens. */
export function parseBar(bar: string, steps: number): BarNote[] {
  const tokens = bar.trim().split(/\s+/);
  if (tokens.length !== steps) throw new Error(`El compás "${bar}" tiene ${tokens.length} pasos, no ${steps}`);
  const notes: BarNote[] = [];
  tokens.forEach((token, step) => {
    if (token === '.') return;
    if (token === '-') {
      const last = notes[notes.length - 1];
      if (!last || last.step + last.length !== step) throw new Error(`"-" sin nota que sostener en "${bar}"`);
      last.length += 1;
      return;
    }
    notes.push({ step, midi: noteToMidi(token), length: 1 });
  });
  return notes;
}

/** Acorde por nombre ("C", "Am", "F#m"): clase de altura de la raíz (0..11) e intervalos de la tríada. */
export function chordTones(chord: string): { root: number; intervals: readonly [number, number, number] } {
  const match = /^([A-G])(#|b)?(m?)$/.exec(chord);
  if (!match) throw new Error(`Acorde inválido: "${chord}"`);
  const [, letter, accidental, minor] = match;
  const root = (NOTE_INDEX[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0) + 12) % 12;
  return { root, intervals: minor ? [0, 3, 7] : [0, 4, 7] };
}
