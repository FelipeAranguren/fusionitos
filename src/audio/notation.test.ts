import { describe, expect, it } from 'vitest';
import { chordTones, midiToHz, noteToMidi, parseBar, toHz } from './notation.ts';

describe('notas', () => {
  it('convierte nombres a MIDI', () => {
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('C#4')).toBe(61);
    expect(noteToMidi('Bb3')).toBe(58);
    expect(noteToMidi('C-1')).toBe(0);
  });

  it('rechaza nombres inválidos', () => {
    expect(() => noteToMidi('H4')).toThrow();
    expect(() => noteToMidi('C')).toThrow();
    expect(() => noteToMidi('c4')).toThrow();
  });

  it('convierte a Hz (La 440)', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(81)).toBe(880);
    expect(toHz('A4')).toBe(440);
    expect(toHz(123)).toBe(123);
    expect(toHz('C4')).toBeCloseTo(261.63, 2);
  });
});

describe('compases', () => {
  it('lee notas, sostenidos y silencios', () => {
    expect(parseBar('E5 - G5 . A5 G5 E5 -', 8)).toEqual([
      { step: 0, midi: 76, length: 2 },
      { step: 2, midi: 79, length: 1 },
      { step: 4, midi: 81, length: 1 },
      { step: 5, midi: 79, length: 1 },
      { step: 6, midi: 76, length: 2 },
    ]);
    expect(parseBar('. . . .', 4)).toEqual([]);
  });

  it('exige la cantidad justa de pasos y un "-" con nota antes', () => {
    expect(() => parseBar('C4 D4', 4)).toThrow();
    expect(() => parseBar('- C4 . .', 4)).toThrow();
    expect(() => parseBar('C4 . - .', 4)).toThrow();
  });
});

describe('acordes', () => {
  it('mayores y menores', () => {
    expect(chordTones('C')).toEqual({ root: 0, intervals: [0, 4, 7] });
    expect(chordTones('Am')).toEqual({ root: 9, intervals: [0, 3, 7] });
    expect(chordTones('F#m')).toEqual({ root: 6, intervals: [0, 3, 7] });
    expect(chordTones('Bb')).toEqual({ root: 10, intervals: [0, 4, 7] });
    expect(() => chordTones('Cmaj7')).toThrow();
  });
});
