import { MUSIC } from '../config/music.ts';
import { chordTones, midiToHz, parseBar, type BarNote } from './notation.ts';
import { playNoise, playTone } from './synth.ts';

// Planificación con margen: un timer revisa seguido y programa en el reloj de Web Audio
// las notas de los próximos instantes. Así el ritmo no depende de que el timer sea puntual.
const LOOKAHEAD_SECONDS = 0.15;
const TIMER_MS = 25;

/** Toca el loop de MUSIC por un nodo de salida. */
export class MusicPlayer {
  private readonly ctx: AudioContext;
  private readonly out: AudioNode;
  private readonly noise: AudioBuffer;
  /** Entrada del eco (melodía y arpegio pasan por acá). */
  private readonly echoIn: GainNode;
  private readonly lead: BarNote[][];
  private readonly stepSeconds: number;
  private readonly totalSteps: number;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;

  constructor(ctx: AudioContext, out: AudioNode, noise: AudioBuffer) {
    this.ctx = ctx;
    this.out = out;
    this.noise = noise;
    this.lead = MUSIC.lead.map((bar) => parseBar(bar, MUSIC.stepsPerBar));
    this.stepSeconds = 60 / MUSIC.bpm / 2;
    this.totalSteps = MUSIC.lead.length * MUSIC.stepsPerBar;

    // Seco + eco con realimentación.
    this.echoIn = ctx.createGain();
    const delay = ctx.createDelay(2);
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    delay.delayTime.value = MUSIC.echo.delaySteps * this.stepSeconds;
    feedback.gain.value = MUSIC.echo.feedback;
    wet.gain.value = MUSIC.echo.wet;
    this.echoIn.connect(out);
    this.echoIn.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(out);
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), TIMER_MS);
  }

  stop(): void {
    if (this.timer === null) return;
    window.clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD_SECONDS) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += this.stepSeconds;
      this.step = (this.step + 1) % this.totalSteps;
    }
  }

  private playStep(globalStep: number, time: number): void {
    const { stepsPerBar, instruments } = MUSIC;
    const bar = Math.floor(globalStep / stepsPerBar);
    const step = globalStep % stepsPerBar;
    const { root, intervals } = chordTones(MUSIC.chords[bar]);

    for (const note of this.lead[bar]) {
      if (note.step !== step) continue;
      this.note(this.echoIn, instruments.lead, midiToHz(note.midi), time, note.length);
    }

    const arpTones = [...intervals, 12];
    const arpMidi = 12 * (MUSIC.arpOctave + 1) + root + arpTones[MUSIC.arpPattern[step]];
    this.note(this.echoIn, instruments.arp, midiToHz(arpMidi), time, 1);

    for (const bass of MUSIC.bass) {
      if (bass.step !== step) continue;
      this.note(this.out, instruments.bass, midiToHz(12 * (bass.octave + 1) + root + intervals[bass.tone]), time, bass.length);
    }

    if ((MUSIC.kickSteps as readonly number[]).includes(step)) {
      playTone(this.ctx, this.out, { wave: 'sine', freq: 120, freqEnd: 45, start: time, duration: 0.14, volume: MUSIC.kick.volume });
    }
    if ((MUSIC.hatSteps as readonly number[]).includes(step)) {
      playNoise(this.ctx, this.out, this.noise, {
        start: time,
        duration: 0.03,
        volume: MUSIC.hat.volume,
        filter: { type: 'highpass', freq: 7000 },
      });
    }
  }

  private note(
    out: AudioNode,
    instrument: (typeof MUSIC.instruments)[keyof typeof MUSIC.instruments],
    freq: number,
    time: number,
    steps: number,
  ): void {
    playTone(this.ctx, out, {
      wave: instrument.wave,
      freq,
      start: time,
      duration: steps * this.stepSeconds + instrument.release,
      volume: instrument.volume,
      attack: instrument.attack,
    });
  }
}
