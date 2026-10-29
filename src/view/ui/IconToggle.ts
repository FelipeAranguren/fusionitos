import Phaser from 'phaser';
import { COLORS } from '../../config/visuals.ts';
import { IconButton, type IconButtonOptions } from './IconButton.ts';

export interface IconToggleOptions extends Omit<IconButtonOptions, 'onPress'> {
  on: boolean;
  onToggle: (on: boolean) => void;
}

/** Botón redondo de prender/apagar: apagado, el ícono se apaga y lo cruza una línea roja. */
export class IconToggle extends IconButton {
  private readonly slash: Phaser.GameObjects.Graphics;
  private readonly onToggle: (on: boolean) => void;
  private isOn: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, options: IconToggleOptions) {
    super(scene, x, y, options);
    const reach = (options.size / 2) * 0.62;
    this.slash = scene.add.graphics();
    this.slash.lineStyle(7, 0xffffff, 1).lineBetween(-reach, -reach, reach, reach);
    this.slash.lineStyle(4, COLORS.danger, 1).lineBetween(-reach, -reach, reach, reach);
    this.add(this.slash);
    this.onToggle = options.onToggle;
    this.isOn = options.on;
    this.render();
  }

  protected override onPress(): void {
    this.isOn = !this.isOn;
    this.render();
    this.onToggle(this.isOn);
  }

  private render(): void {
    this.icon.setAlpha(this.isOn ? 1 : 0.5);
    this.slash.setVisible(!this.isOn);
  }
}
