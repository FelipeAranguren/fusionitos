import Phaser from 'phaser';
import { COLORS } from '../../config/visuals.ts';

export interface IconToggleOptions {
  /** Clave de textura del ícono. */
  icon: string;
  size: number;
  /** Área de toque extra alrededor del dibujo (para el dedo). */
  hitPadding?: number;
  on: boolean;
  /** Para encontrarlo desde el hook de debug. */
  name: string;
  onToggle: (on: boolean) => void;
}

/** Botón redondo de prender/apagar: apagado, el ícono se apaga y lo cruza una línea roja. */
export class IconToggle extends Phaser.GameObjects.Container {
  private readonly icon: Phaser.GameObjects.Image;
  private readonly slash: Phaser.GameObjects.Graphics;
  private isOn: boolean;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: IconToggleOptions) {
    super(scene, x, y);
    const { size } = options;
    const radius = size / 2;
    const disc = scene.add.graphics();
    disc.fillStyle(0x000000, 0.25).fillCircle(0, 5, radius);
    disc.fillStyle(COLORS.neutral, 1).fillCircle(0, 0, radius);
    this.icon = scene.add.image(0, 0, options.icon).setDisplaySize(size * 0.62, size * 0.62);
    this.slash = scene.add.graphics();
    const reach = radius * 0.62;
    this.slash.lineStyle(7, 0xffffff, 1).lineBetween(-reach, -reach, reach, reach);
    this.slash.lineStyle(4, COLORS.danger, 1).lineBetween(-reach, -reach, reach, reach);
    this.add([disc, this.icon, this.slash]);
    this.setName(options.name);
    this.isOn = options.on;
    this.render();

    const hit = size + (options.hitPadding ?? 0);
    this.setSize(hit, hit);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.pressed = true;
      this.setScale(0.92);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.pressed = false;
      this.setScale(1);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.setScale(1);
      if (!this.pressed) return;
      this.pressed = false;
      this.isOn = !this.isOn;
      this.render();
      options.onToggle(this.isOn);
    });
    scene.add.existing(this);
  }

  private render(): void {
    this.icon.setAlpha(this.isOn ? 1 : 0.5);
    this.slash.setVisible(!this.isOn);
  }
}
