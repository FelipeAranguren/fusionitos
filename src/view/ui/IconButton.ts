import Phaser from 'phaser';
import { COLORS } from '../../config/visuals.ts';

export interface IconButtonOptions {
  /** Clave de textura del ícono. */
  icon: string;
  size: number;
  /** Área de toque extra alrededor del dibujo (para el dedo). */
  hitPadding?: number;
  color?: number;
  /** Para encontrarlo desde el hook de debug. */
  name: string;
  onPress?: () => void;
}

/** Botón redondo con un ícono. */
export class IconButton extends Phaser.GameObjects.Container {
  protected readonly icon: Phaser.GameObjects.Image;
  private readonly onPressed: (() => void) | undefined;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: IconButtonOptions) {
    super(scene, x, y);
    const { size } = options;
    const radius = size / 2;
    const disc = scene.add.graphics();
    disc.fillStyle(0x000000, 0.25).fillCircle(0, 5, radius);
    disc.fillStyle(options.color ?? COLORS.neutral, 1).fillCircle(0, 0, radius);
    this.icon = scene.add.image(0, 0, options.icon).setDisplaySize(size * 0.62, size * 0.62);
    this.add([disc, this.icon]);
    this.setName(options.name);
    this.onPressed = options.onPress;

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
      this.onPress();
    });
    scene.add.existing(this);
  }

  /** Se tocó y se soltó encima. */
  protected onPress(): void {
    this.onPressed?.();
  }
}
