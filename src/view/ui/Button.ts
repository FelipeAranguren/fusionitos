import Phaser from 'phaser';
import { COLORS } from '../../config/visuals.ts';
import { textStyle } from './textStyle.ts';

export interface ButtonOptions {
  label: string;
  width: number;
  height: number;
  color: number;
  fontSize?: number;
  /** Textura a la izquierda del texto (por ejemplo, la moneda de un precio). */
  icon?: string;
  /** Para encontrarlo desde el hook de debug; si falta, se usa el texto. */
  name?: string;
  onClick: () => void;
}

/** Botón redondeado. Se activa al soltar sobre él, solo si se apretó sobre él y está habilitado. */
export class Button extends Phaser.GameObjects.Container {
  // Ojo: `width`/`height` ya son de Container; por eso estos nombres.
  private readonly buttonWidth: number;
  private readonly buttonHeight: number;
  private readonly baseColor: number;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly caption: Phaser.GameObjects.Text;
  private readonly iconImage: Phaser.GameObjects.Image | null;
  private enabled = true;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions) {
    super(scene, x, y);
    this.buttonWidth = options.width;
    this.buttonHeight = options.height;
    this.baseColor = options.color;
    const fontSize = options.fontSize ?? 44;
    this.panel = scene.add.graphics();
    this.caption = scene.add.text(0, 0, options.label, textStyle({ size: fontSize, weight: 700 })).setOrigin(0.5);
    this.iconImage = options.icon ? scene.add.image(0, 0, options.icon).setDisplaySize(fontSize * 1.15, fontSize * 1.15) : null;
    this.add(this.iconImage ? [this.panel, this.iconImage, this.caption] : [this.panel, this.caption]);
    if (options.name) this.setName(options.name);
    this.draw();
    this.layoutContent();

    this.setSize(options.width, options.height);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.setScale(0.95);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.pressed = false;
      this.setScale(1);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.setScale(1);
      if (!this.pressed || !this.enabled) return;
      this.pressed = false;
      options.onClick();
    });
    scene.add.existing(this);
  }

  get label(): string {
    return this.caption.text;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setLabel(label: string): this {
    if (label === this.caption.text) return this;
    this.caption.setText(label);
    this.layoutContent();
    return this;
  }

  /** Deshabilitado se ve gris y no responde. */
  setEnabled(enabled: boolean): this {
    if (enabled === this.enabled) return this;
    this.enabled = enabled;
    this.pressed = false;
    this.draw();
    return this;
  }

  private draw(): void {
    const width = this.buttonWidth;
    const height = this.buttonHeight;
    const radius = height / 2;
    const left = -width / 2;
    const top = -height / 2;
    const g = this.panel.clear();
    g.fillStyle(0x000000, 0.25).fillRoundedRect(left, top + 8, width, height, radius);
    g.fillStyle(this.enabled ? this.baseColor : COLORS.disabled, 1).fillRoundedRect(left, top, width, height, radius);
    g.fillStyle(0xffffff, 0.18).fillRoundedRect(left + 12, top + 6, width - 24, height * 0.42, radius * 0.8);
    const alpha = this.enabled ? 1 : 0.8;
    this.caption.setAlpha(alpha);
    this.iconImage?.setAlpha(alpha);
  }

  /** Centra ícono + texto como un bloque. */
  private layoutContent(): void {
    if (!this.iconImage) return;
    const gap = 10;
    const iconWidth = this.iconImage.displayWidth;
    const total = iconWidth + gap + this.caption.width;
    this.iconImage.setX(-total / 2 + iconWidth / 2);
    this.caption.setX(this.iconImage.x + iconWidth / 2 + gap + this.caption.width / 2);
  }
}
