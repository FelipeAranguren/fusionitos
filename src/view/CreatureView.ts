import Phaser from 'phaser';
import { ANIM, COLORS, DEPTH, SIZES, WANDER } from '../config/visuals.ts';
import type { EntityId } from '../core/types.ts';
import { clampToField } from './fieldSpace.ts';
import { creatureTextureKey } from './textures.ts';

type Mode = 'idle' | 'walk' | 'drag' | 'merging';
export type Highlight = 'none' | 'match' | 'target';

/**
 * Criatura en pantalla. Deambula, se arrastra y se anima al fusionarse.
 * Es solo visual: avisa con `onSettled` cuando termina un movimiento para que la escena
 * guarde la posición en el modelo.
 */
export class CreatureView extends Phaser.GameObjects.Container {
  readonly entityId: EntityId;
  readonly level: number;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Ellipse;
  private readonly baseScale: number;
  private readonly onSettled: (view: CreatureView) => void;
  private mode: Mode = 'idle';
  private highlight: Highlight = 'none';
  private wanderTimer: Phaser.Time.TimerEvent | null = null;
  private walkTween: Phaser.Tweens.Tween | null = null;
  private hopTween: Phaser.Tweens.Tween | null = null;
  private ringTween: Phaser.Tweens.Tween | null = null;
  private dragged = false;

  constructor(
    scene: Phaser.Scene,
    entityId: EntityId,
    level: number,
    x: number,
    y: number,
    onSettled: (view: CreatureView) => void,
  ) {
    super(scene, x, y);
    this.entityId = entityId;
    this.level = level;
    this.onSettled = onSettled;

    const size = SIZES.creature;
    const shadow = scene.add.ellipse(0, size * 0.42, size * 0.68, size * 0.2, COLORS.shadow, COLORS.shadowAlpha);
    this.ring = scene.add.ellipse(0, size * 0.42, size * 0.98, size * 0.34);
    this.ring.setVisible(false);
    this.sprite = scene.add.image(0, 0, creatureTextureKey(level)).setDisplaySize(size, size);
    this.baseScale = this.sprite.scaleX;
    this.add([this.ring, shadow, this.sprite]);

    this.setSize(size * 0.85, size * 0.95);
    this.setInteractive({ draggable: true, useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.dragged = false;
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (!this.dragged) this.bounce();
    });
    scene.add.existing(this);
    this.breathe();
  }

  get isDragging(): boolean {
    return this.mode === 'drag';
  }

  get isMerging(): boolean {
    return this.mode === 'merging';
  }

  /** Aparece con un "pop" (más grande si viene de un merge) y empieza a deambular. */
  playSpawn(fromMerge: boolean): void {
    this.setScale(0);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: fromMerge ? ANIM.spawnPopMs : ANIM.hatchPopMs,
      ease: fromMerge ? 'Back.easeOut(3)' : 'Back.easeOut',
      onComplete: () => this.scheduleWander(),
    });
  }

  startWander(): void {
    this.scheduleWander(Phaser.Math.Between(0, WANDER.maxPauseMs));
  }

  beginDrag(): void {
    this.mode = 'drag';
    this.dragged = true;
    this.stopWander();
    this.setDepth(DEPTH.dragged);
    this.scene.tweens.add({ targets: this, scale: ANIM.dragScale, duration: 120, ease: 'Back.easeOut' });
  }

  endDrag(): void {
    this.mode = 'idle';
    this.scene.tweens.add({ targets: this, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.scheduleWander();
  }

  setHighlight(highlight: Highlight): void {
    if (highlight === this.highlight) return;
    this.highlight = highlight;
    this.ringTween?.stop();
    this.ringTween = null;
    this.ring.setVisible(highlight !== 'none').setScale(1).setAlpha(1);
    if (highlight === 'none') return;
    const target = highlight === 'target';
    this.ring.setStrokeStyle(target ? 12 : 7, target ? COLORS.highlightTarget : COLORS.highlightMatch, 1);
    this.ringTween = this.scene.tweens.add({
      targets: this.ring,
      scale: target ? 1.15 : 1.06,
      alpha: target ? 1 : 0.55,
      duration: target ? 260 : 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Va hacia el punto de encuentro, se achica y se destruye. */
  playMergeInto(x: number, y: number): void {
    this.mode = 'merging';
    this.stopWander();
    this.setHighlight('none');
    this.disableInteractive();
    this.scene.tweens.killTweensOf(this);
    this.setDepth(DEPTH.dragged - 1);
    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration: ANIM.mergeMoveMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          scale: 0,
          duration: ANIM.mergeShrinkMs,
          ease: 'Back.easeIn',
          onComplete: () => this.destroy(),
        });
      },
    });
  }

  override destroy(fromScene?: boolean): void {
    this.stopWander();
    this.ringTween?.stop();
    this.scene?.tweens.killTweensOf([this, this.sprite, this.ring]);
    super.destroy(fromScene);
  }

  private scheduleWander(delay: number = Phaser.Math.Between(WANDER.minPauseMs, WANDER.maxPauseMs)): void {
    this.wanderTimer?.remove(false);
    this.wanderTimer = this.scene.time.delayedCall(delay, () => this.walk());
  }

  private stopWander(): void {
    this.wanderTimer?.remove(false);
    this.wanderTimer = null;
    this.walkTween?.stop();
    this.walkTween = null;
    this.stopHop();
  }

  private walk(): void {
    if (this.mode !== 'idle') return;
    const angle = Math.random() * Math.PI * 2;
    const distance = Phaser.Math.Between(WANDER.minStep, WANDER.maxStep);
    const target = clampToField(this.x + Math.cos(angle) * distance, this.y + Math.sin(angle) * distance * 0.7);
    const length = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (length < 20) {
      this.scheduleWander();
      return;
    }
    this.mode = 'walk';
    this.startHop();
    this.walkTween = this.scene.tweens.add({
      targets: this,
      x: target.x,
      y: target.y,
      duration: (length / WANDER.speed) * 1000,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.walkTween = null;
        this.stopHop();
        this.mode = 'idle';
        this.onSettled(this);
        this.scheduleWander();
      },
    });
  }

  private startHop(): void {
    this.hopTween = this.scene.tweens.add({
      targets: this.sprite,
      y: -WANDER.hopHeight,
      duration: WANDER.hopMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeOut',
    });
  }

  private stopHop(): void {
    this.hopTween?.stop();
    this.hopTween = null;
    this.sprite.y = 0;
  }

  /** Respiración suave: se aplasta y estira apenas, siempre. */
  private breathe(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.baseScale * 1.03,
      scaleY: this.baseScale * 0.96,
      duration: Phaser.Math.Between(800, 1100),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Saltito al tocarla sin arrastrar. */
  private bounce(): void {
    if (this.mode !== 'idle' && this.mode !== 'walk') return;
    this.stopHop();
    this.scene.tweens.add({ targets: this.sprite, y: -40, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
  }
}
