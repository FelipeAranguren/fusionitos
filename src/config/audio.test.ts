import { describe, expect, it } from 'vitest';
import { chordTones, parseBar, toHz } from '../audio/notation.ts';
import { MUSIC } from './music.ts';
import { SOUNDS, type SoundLayer } from './sounds.ts';

describe('recetas de sonido', () => {
  const layers: [string, SoundLayer][] = Object.entries(SOUNDS).flatMap(([name, recipe]) =>
    recipe.layers.map((layer): [string, SoundLayer] => [name, layer]),
  );

  it.each(layers)('%s: alturas válidas, volumen entre 0 y 1, duración positiva', (_name, layer) => {
    expect(layer.volume).toBeGreaterThan(0);
    expect(layer.volume).toBeLessThanOrEqual(1);
    if ('notes' in layer) {
      for (const note of layer.notes) expect(toHz(note)).toBeGreaterThan(20);
      expect(layer.noteDuration).toBeGreaterThan(0);
      return;
    }
    expect(layer.duration).toBeGreaterThan(0);
    if (layer.wave !== 'noise') {
      expect(toHz(layer.pitch)).toBeGreaterThan(20);
      if (layer.pitchEnd !== undefined) expect(toHz(layer.pitchEnd)).toBeGreaterThan(20);
    }
  });
});

describe('partitura', () => {
  it('cada compás de la melodía tiene la cantidad justa de pasos', () => {
    for (const bar of MUSIC.lead) expect(() => parseBar(bar, MUSIC.stepsPerBar)).not.toThrow();
  });

  it('hay un acorde válido por compás', () => {
    expect(MUSIC.chords).toHaveLength(MUSIC.lead.length);
    for (const chord of MUSIC.chords) expect(() => chordTones(chord)).not.toThrow();
  });

  it('los patrones entran en el compás', () => {
    expect(MUSIC.arpPattern).toHaveLength(MUSIC.stepsPerBar);
    for (const step of [...MUSIC.kickSteps, ...MUSIC.hatSteps, ...MUSIC.bass.map((b) => b.step)]) {
      expect(step).toBeGreaterThanOrEqual(0);
      expect(step).toBeLessThan(MUSIC.stepsPerBar);
    }
  });
});
