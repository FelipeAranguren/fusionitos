import { AUDIO_MIX, SOUNDS, type SoundName, type SoundRecipe } from '../config/sounds.ts';
import type { StorageLike } from '../core/save.ts';
import { MusicPlayer } from './MusicPlayer.ts';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from './settings.ts';
import { createNoiseBuffer, playRecipe } from './synth.ts';

export interface PlayOptions {
  /** Transpone el sonido (por ejemplo, según el tier de la criatura). */
  semitones?: number;
}

/** Lo que las escenas necesitan del audio. */
export interface AudioPort {
  play(name: SoundName, options?: PlayOptions): void;
  readonly musicOn: boolean;
  readonly sfxOn: boolean;
  setMusic(on: boolean): void;
  setSfx(on: boolean): void;
}

/**
 * Sonido del juego con Web Audio: efectos sintetizados y música en loop.
 * Los navegadores solo dejan arrancar el audio después de un gesto del usuario: hasta que se
 * llama a `unlock()` desde uno, todo queda en silencio (y no falla).
 */
export class AudioEngine implements AudioPort {
  private readonly storage: StorageLike | null;
  private readonly settings: AudioSettings;
  private readonly lastPlayedAt = new Map<SoundName, number>();
  /** Últimos sonidos que sonaron (para depurar). */
  readonly recent: SoundName[] = [];
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private music: MusicPlayer | null = null;
  private paused = false;

  constructor(storage: StorageLike | null) {
    this.storage = storage;
    this.settings = loadAudioSettings(storage);
  }

  get musicOn(): boolean {
    return this.settings.music;
  }

  get sfxOn(): boolean {
    return this.settings.sfx;
  }

  get state(): AudioContextState | 'locked' {
    return this.ctx?.state ?? 'locked';
  }

  get musicPlaying(): boolean {
    return this.music?.playing ?? false;
  }

  /** Llamar en cada gesto del usuario: crea el audio la primera vez y lo reanuda si quedó suspendido. */
  unlock(): void {
    if (!this.ctx) this.create();
    const ctx = this.ctx;
    if (!ctx || this.paused) return;
    if (ctx.state === 'suspended') void ctx.resume();
    if (this.settings.music) this.music?.start();
  }

  /** Con la pestaña oculta el juego está en pausa: el audio también. */
  pause(): void {
    this.paused = true;
    void this.ctx?.suspend();
  }

  resume(): void {
    this.paused = false;
    void this.ctx?.resume();
  }

  play(name: SoundName, options: PlayOptions = {}): void {
    const { ctx, sfxBus, noise } = this;
    if (!ctx || !sfxBus || !noise || ctx.state !== 'running' || !this.settings.sfx) return;
    const recipe: SoundRecipe = SOUNDS[name];
    const now = performance.now();
    if (recipe.minGapMs !== undefined && now - (this.lastPlayedAt.get(name) ?? -Infinity) < recipe.minGapMs) return;
    this.lastPlayedAt.set(name, now);
    const jitter = recipe.jitter ? (Math.random() * 2 - 1) * recipe.jitter : 0;
    playRecipe(ctx, sfxBus, noise, recipe, ctx.currentTime + 0.005, (options.semitones ?? 0) + jitter);
    this.recent.push(name);
    if (this.recent.length > 40) this.recent.shift();
  }

  setMusic(on: boolean): void {
    this.settings.music = on;
    saveAudioSettings(this.storage, this.settings);
    const { ctx, musicBus } = this;
    if (!ctx || !musicBus) return;
    // Fundido para que no corte en seco; el loop arranca o para después.
    musicBus.gain.setTargetAtTime(on ? AUDIO_MIX.music : 0, ctx.currentTime, AUDIO_MIX.musicFadeSeconds);
    if (on && !this.paused) this.music?.start();
    else if (!on) window.setTimeout(() => !this.settings.music && this.music?.stop(), AUDIO_MIX.musicFadeSeconds * 4000);
  }

  setSfx(on: boolean): void {
    this.settings.sfx = on;
    saveAudioSettings(this.storage, this.settings);
  }

  private create(): void {
    const AudioContextClass =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return; // Navegador sin Web Audio: el juego sigue en silencio.
    const ctx = new AudioContextClass();
    const master = ctx.createGain();
    master.gain.value = AUDIO_MIX.master;
    master.connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = AUDIO_MIX.sfx;
    this.sfxBus.connect(master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.settings.music ? AUDIO_MIX.music : 0;
    this.musicBus.connect(master);
    this.noise = createNoiseBuffer(ctx);
    this.music = new MusicPlayer(ctx, this.musicBus, this.noise);
    this.ctx = ctx;
  }
}
