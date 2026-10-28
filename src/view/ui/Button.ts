import Phaser from 'phaser';
import { textStyle } from './textStyle.ts';

export interface ButtonOptions {
  label: string;
  width: number;
  height: number;
  color: number;
  fontSize?: number;
  onClick: () => void;
}

/** Botón redondeado. Se activa al soltar sobre él, solo si se apretó sobre él. */
export class Button extends Phaser.GameObjects.Container {
  readonly label: string;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions) {
    super(scene, x, y);
    this.label = options.label;
    const { width, height, color } = options;
    const radius = height / 2;
    const left = -width / 2;
    const top = -height / 2;

    const body = scene.add.graphics();
    body.fillStyle(0x000000, 0.25).fillRoundedRect(left, top + 8, width, height, radius);
    body.fillStyle(color, 1).fillRoundedRect(left, top, width, height, radius);
    body.fillStyle(0xffffff, 0.18).fillRoundedRect(left + 12, top + 6, width - 24, height * 0.42, radius * 0.8);
    const text = scene.add.text(0, 0, options.label, textStyle({ size: options.fontSize ?? 44, weight: 700 })).setOrigin(0.5);
    this.add([body, text]);

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.pressed = true;
      this.setScale(0.95);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.pressed = false;
      this.setScale(1);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.setScale(1);
      if (!this.pressed) return;
      this.pressed = false;
      options.onClick();
    });
    scene.add.existing(this);
  }
}
