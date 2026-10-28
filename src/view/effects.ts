import Phaser from 'phaser';
import { STRINGS } from '../config/strings.ts';
import { ANIM, COLORS, DEPTH } from '../config/visuals.ts';
import { formatNumber } from '../core/format.ts';
import { TEXTURES } from './textures.ts';
import { textStyle } from './ui/textStyle.ts';

/** Efectos de una escena: partículas, ondas y textos flotantes. */
export class Effects {
  private readonly scene: Phaser.Scene;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly shells: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, accentColor: number) {
    this.scene = scene;
    this.sparks = scene.add
      .particles(0, 0, TEXTURES.spark, {
        emitting: false,
        speed: { min: 180, max: 560 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.7, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 380, max: 780 },
        gravityY: 380,
        tint: [0xffffff, 0xffe066, accentColor],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.effects);
    this.shells = scene.add
      .particles(0, 0, TEXTURES.shell, {
        emitting: false,
        speed: { min: 200, max: 460 },
        angle: { min: 200, max: 340 },
        rotate: { min: 0, max: 360 },
        scale: { start: 1.3, end: 0.7 },
        alpha: { start: 1, end: 0 },
        lifespan: 700,
        gravityY: 1400,
      })
      .setDepth(DEPTH.effects);
  }

  mergeBurst(x: number, y: number): void {
    this.sparks.explode(36, x, y);
    this.shockwave(x, y);
  }

  hatchBurst(x: number, y: number): void {
    this.shells.explode(12, x, y);
    this.sparks.explode(10, x, y);
  }

  shockwave(x: number, y: number): void {
    const ring = this.scene.add.circle(x, y, 44).setStrokeStyle(10, 0xffffff, 0.9).setDepth(DEPTH.effects);
    this.scene.tweens.add({
      targets: ring,
      scale: 3.4,
      alpha: 0,
      duration: 460,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /** "+X" con una moneda, que sube y se desvanece. */
  coinPop(x: number, y: number, amount: number): void {
    const label = this.scene.add
      .text(0, 0, STRINGS.coinPop(formatNumber(amount)), textStyle({ size: 46, weight: 700, color: COLORS.textCoin }))
      .setOrigin(0, 0.5);
    const icon = this.scene.add.image(0, 0, TEXTURES.coin).setDisplaySize(44, 44);
    const gap = 6;
    const total = icon.displayWidth + gap + label.width;
    icon.setX(-total / 2 + icon.displayWidth / 2);
    label.setX(icon.x + icon.displayWidth / 2 + gap);
    this.float(this.scene.add.container(x, y, [icon, label]));
  }

  floatingText(x: number, y: number, text: string, size = 52): void {
    const label = this.scene.add.text(0, 0, text, textStyle({ size, weight: 700 })).setOrigin(0.5);
    this.float(this.scene.add.container(x, y, [label]));
  }

  private float(container: Phaser.GameObjects.Container): void {
    container.setDepth(DEPTH.floatingText).setScale(0.6);
    this.scene.tweens.add({ targets: container, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: container,
      y: container.y - ANIM.coinTextRise,
      duration: ANIM.coinTextMs,
      ease: 'Cubic.easeOut',
    });
    this.scene.tweens.add({
      targets: container,
      alpha: 0,
      delay: ANIM.coinTextMs * 0.55,
      duration: ANIM.coinTextMs * 0.45,
      onComplete: () => container.destroy(),
    });
  }
}
