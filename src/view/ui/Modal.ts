import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../../config/visuals.ts';

/**
 * Popup modal: oscurece la pantalla y muestra una tarjeta centrada. El fondo es interactivo,
 * así que mientras esté abierto bloquea el input del campo (globalTopOnly).
 * El contenido se agrega a `card`, en coordenadas relativas a su centro.
 */
export class Modal extends Phaser.GameObjects.Container {
  readonly card: Phaser.GameObjects.Container;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly onClosed: () => void;
  private closing = false;

  constructor(scene: Phaser.Scene, width: number, height: number, onClosed: () => void) {
    super(scene, 0, 0);
    this.onClosed = onClosed;
    this.dim = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.dim, COLORS.dimAlpha).setOrigin(0);
    this.dim.setInteractive();

    const background = scene.add.graphics();
    background.fillStyle(0x000000, 0.25).fillRoundedRect(-width / 2, -height / 2 + 16, width, height, 56);
    background.fillStyle(COLORS.card, 1).fillRoundedRect(-width / 2, -height / 2, width, height, 56);
    this.card = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [background]);

    this.add([this.dim, this.card]);
    this.setDepth(1000);
    scene.add.existing(this);

    this.dim.setAlpha(0);
    this.card.setScale(0.7).setAlpha(0);
    scene.tweens.add({ targets: this.dim, alpha: 1, duration: 180 });
    scene.tweens.add({ targets: this.card, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' });
  }

  close(): void {
    if (this.closing) return;
    this.closing = true;
    this.dim.disableInteractive();
    this.scene.tweens.add({ targets: this.dim, alpha: 0, duration: 160 });
    this.scene.tweens.add({
      targets: this.card,
      scale: 0.85,
      alpha: 0,
      duration: 160,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.destroy();
        this.onClosed();
      },
    });
  }

  override destroy(fromScene?: boolean): void {
    // Corta tweens infinitos del contenido (por ejemplo, rayos girando).
    this.scene?.tweens.killTweensOf([this.dim, this.card, ...this.card.list]);
    super.destroy(fromScene);
  }
}
