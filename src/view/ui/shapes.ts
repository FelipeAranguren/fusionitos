import Phaser from 'phaser';

// Formas con contorno calculado una sola vez. Los Graphics de Phaser vuelven a triangular sus curvas
// en cada frame (cada esquina redondeada son ~100 puntos): con muchos en pantalla, el juego se traba
// en el celular. Para rectángulos redondeados y círculos que se ven siempre, usar estas formas.

/** Rectángulo redondeado relleno, centrado en (x, y). */
export function roundedRect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: number,
  alpha = 1,
): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(x, y, width, height, color, alpha).setRounded(radius);
}

/** Borde de un rectángulo redondeado, centrado en (x, y). El trazo queda por dentro del tamaño dado. */
export class RoundedFrame extends Phaser.GameObjects.Rectangle {
  private readonly outerWidth: number;
  private readonly outerHeight: number;
  private readonly outerRadius: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    lineWidth: number,
    color: number,
    alpha = 1,
  ) {
    super(scene, x, y, width, height);
    this.outerWidth = width;
    this.outerHeight = height;
    this.outerRadius = radius;
    this.setLine(lineWidth, color, alpha);
    scene.add.existing(this);
  }

  /** Cambia el trazo, siempre por dentro del tamaño original. */
  setLine(lineWidth: number, color: number, alpha = 1): this {
    return this.setSize(this.outerWidth - lineWidth, this.outerHeight - lineWidth)
      .setRounded(this.outerRadius - lineWidth / 2)
      .setStrokeStyle(lineWidth, color, alpha);
  }
}
