import { AUDIO_MIX } from '../config/sounds.ts';

export interface MixBuses {
  sfx: GainNode;
  music: GainNode;
}

/**
 * Cadena de salida: efectos y música → volumen general → corte de graves → limitador → parlantes.
 * El corte evita que los parlantes chicos se saturen con graves que no pueden reproducir;
 * el limitador evita recortes cuando se juntan muchos sonidos.
 */
export function createMix(ctx: BaseAudioContext, musicOn: boolean): MixBuses {
  const lowCut = ctx.createBiquadFilter();
  lowCut.type = 'highpass';
  lowCut.frequency.value = AUDIO_MIX.lowCutHz;
  lowCut.Q.value = 0.7;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = AUDIO_MIX.limiter.thresholdDb;
  limiter.knee.value = AUDIO_MIX.limiter.kneeDb;
  limiter.ratio.value = AUDIO_MIX.limiter.ratio;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;

  const master = ctx.createGain();
  master.gain.value = AUDIO_MIX.master;
  master.connect(lowCut).connect(limiter).connect(ctx.destination);

  const sfx = ctx.createGain();
  sfx.gain.value = AUDIO_MIX.sfx;
  sfx.connect(master);
  const music = ctx.createGain();
  music.gain.value = musicOn ? AUDIO_MIX.music : 0;
  music.connect(master);
  return { sfx, music };
}
