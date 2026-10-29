import type Phaser from 'phaser';
import { ANIM, GAME_WIDTH, LAYOUT } from '../../config/visuals.ts';
import { roundedRect } from './shapes.ts';
import { textStyle } from './textStyle.ts';

/** Avisos cortos en una píldora, de a uno por vez. */
export class ToastQueue {
  private readonly scene: Phaser.Scene;
  private readonly queue: string[] = [];
  private current: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  push(text: string): void {
    // Evita repetir el mismo aviso mientras se está mostrando o ya está en cola.
    if (this.queue.includes(text) || this.current?.getData('text') === text) return;
    this.queue.push(text);
    if (!this.current) this.showNext();
  }

  clear(): void {
    this.queue.length = 0;
    if (this.current) {
      this.scene.tweens.killTweensOf(this.current);
      this.current.destroy();
    }
    this.current = null;
  }

  private showNext(): void {
    const text = this.queue.shift();
    if (text === undefined) return;
    // Los avisos largos pasan a dos líneas en lugar de salirse de la pantalla.
    const style = { ...textStyle({ size: 40, stroke: false }), align: 'center', wordWrap: { width: GAME_WIDTH - 160 } };
    const label = this.scene.add.text(0, 0, text, style).setOrigin(0.5);
    const width = label.width + 80;
    const height = label.height + 36;
    const background = roundedRect(this.scene, 0, 0, width, height, Math.min(height / 2, 44), 0x000000, 0.75);
    const toast = this.scene.add.container(GAME_WIDTH / 2, LAYOUT.toastY + 20, [background, label]);
    toast.setDepth(900).setAlpha(0).setData('text', text);
    this.current = toast;

    this.scene.tweens.add({ targets: toast, alpha: 1, y: LAYOUT.toastY, duration: 180, ease: 'Quad.easeOut' });
    this.scene.tweens.add({
      targets: toast,
      alpha: 0,
      delay: ANIM.toastMs,
      duration: 220,
      onComplete: () => {
        toast.destroy();
        if (this.current === toast) this.current = null;
        this.showNext();
      },
    });
  }
}
