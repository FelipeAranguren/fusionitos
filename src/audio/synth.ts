import type { NoiseLayer, SoundRecipe, Wave } from '../config/sounds.ts';
import { toHz } from './notation.ts';

// Las rampas exponenciales no admiten 0.
const SILENT = 0.0001;

export interface ToneOptions {
  wave: Wave;
  freq: number;
  freqEnd?: number;
  start: number;
  duration: number;
  volume: number;
  attack?: number;
}

/** Ataque corto (sin clic) y caída exponencial hasta el silencio. */
function envelope(param: AudioParam, start: number, duration: number, volume: number, attack = 0.008): void {
  const rise = Math.min(attack, duration * 0.5);
  param.setValueAtTime(SILENT, start);
  param.exponentialRampToValueAtTime(volume, start + rise);
  param.exponentialRampToValueAtTime(SILENT, start + duration);
}

/** Programa una nota. Los nodos se desconectan solos cuando termina. */
export function playTone(ctx: BaseAudioContext, out: AudioNode, options: ToneOptions): void {
  const { wave, freq, freqEnd, duration, volume, attack } = options;
  // Nunca en el pasado: la envolvente se aplicaría de golpe y sonaría un clic.
  const start = Math.max(options.start, ctx.currentTime);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(freqEnd, start + duration);
  envelope(gain.gain, start, duration, volume, attack);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + duration + 0.05);
  osc.onended = () => gain.disconnect();
}

export function playNoise(
  ctx: BaseAudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  layer: Omit<NoiseLayer, 'wave' | 'start'> & { start: number },
): void {
  const { duration, volume, attack, filter } = layer;
  const start = Math.max(layer.start, ctx.currentTime);
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = noise;
  let node: AudioNode = source;
  if (filter) {
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter.type;
    biquad.Q.value = filter.q ?? 1;
    biquad.frequency.setValueAtTime(filter.freq, start);
    if (filter.freqEnd !== undefined) biquad.frequency.exponentialRampToValueAtTime(filter.freqEnd, start + duration);
    node = source.connect(biquad);
  }
  envelope(gain.gain, start, duration, volume, attack);
  node.connect(gain).connect(out);
  // Arranca en un punto al azar del buffer para que dos ruidos seguidos no sean idénticos.
  source.start(start, Math.random() * Math.max(0, noise.duration - duration - 0.1));
  source.stop(start + duration + 0.05);
  source.onended = () => gain.disconnect();
}

/** Un segundo de ruido blanco, reutilizable. */
export function createNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Reproduce una receta en `when`, transpuesta `semitones`. */
export function playRecipe(
  ctx: BaseAudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  recipe: SoundRecipe,
  when: number,
  semitones = 0,
): void {
  const ratio = 2 ** (semitones / 12);
  for (const layer of recipe.layers) {
    const start = when + (layer.start ?? 0);
    if (layer.wave === 'noise') {
      playNoise(ctx, out, noise, { ...layer, start });
    } else if ('notes' in layer) {
      layer.notes.forEach((note, i) =>
        playTone(ctx, out, {
          wave: layer.wave,
          freq: toHz(note) * ratio,
          start: start + i * layer.spacing,
          duration: layer.noteDuration,
          volume: layer.volume,
          attack: layer.attack,
        }),
      );
    } else {
      playTone(ctx, out, {
        wave: layer.wave,
        freq: toHz(layer.pitch) * ratio,
        freqEnd: layer.pitchEnd === undefined ? undefined : toHz(layer.pitchEnd) * ratio,
        start,
        duration: layer.duration,
        volume: layer.volume,
        attack: layer.attack,
      });
    }
  }
}
