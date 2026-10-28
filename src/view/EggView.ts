import Phaser from 'phaser';
import { ANIM, COLORS, SIZES } from '../config/visuals.ts';
import type { EntityId } from '../core/types.ts';
import { TEXTURES } from './textures.ts';

/** Huevo en pantalla: cae con rebote, se balancea y se abre al tocarlo. Solo visual. */
export class EggView extends Phaser.GameObjects.Container {
  readonly entityId: EntityId;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private wiggleTimer: Phaser.Time.TimerEvent | null = null;
  private hatching = false;

  constructor(scene: Phaser.Scene, entityId: EntityId, x: number, y: number, onTap: (view: EggView) => void) {
    super(scene, x, y);
    this.entityId = entityId;
    const size = SIZES.egg;
    this.shadow = scene.add.ellipse(0, size * 0.44, size * 0.62, size * 0.17, COLORS.shadow, COLORS.shadowAlpha);
    this.sprite = scene.add.image(0, 0, TEXTURES.egg).setDisplaySize(size, size);
    this.add([this.shadow, this.sprite]);

    this.setSize(size, size);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (!this.hatching) onTap(this);
    });
    scene.add.existing(this);
  }

  /** Cae desde arriba con rebote; la sombra crece al acercarse al suelo. `onLand`, al primer toque. */
  playDrop(onLand?: () => void): void {
    // Con Bounce.easeOut el primer toque contra el suelo llega a 1/2.75 de la duración.
    if (onLand) this.scene.time.delayedCall(ANIM.eggDropMs / 2.75, onLand);
    this.sprite.setY(-ANIM.eggDropHeight).setAlpha(0);
    this.shadow.setScale(0.25).setAlpha(0);
    this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 150 });
    this.scene.tweens.add({ targets: this.sprite, y: 0, duration: ANIM.eggDropMs, ease: 'Bounce.easeOut' });
    this.scene.tweens.add({
      targets: this.shadow,
      scale: 1,
      alpha: 1,
      duration: ANIM.eggDropMs * 0.6,
      ease: 'Quad.easeIn',
      onComplete: () => this.startWiggle(),
    });
  }

  /** Se balancea cada tanto para invitar a tocarlo. */
  startWiggle(): void {
    this.wiggleTimer?.remove(false);
    this.wiggleTimer = this.scene.time.addEvent({
      delay: 2400,
      startAt: Phaser.Math.Between(0, 1800),
      loop: true,
      callback: () => {
        this.scene.tweens.add({
          targets: this.sprite,
          angle: { from: -9, to: 9 },
          duration: 110,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut',
          onComplete: () => this.sprite.setAngle(0),
        });
      },
    });
  }

  /** Se sacude, se rompe y llama a `onOpen` cuando hay que mostrar la criatura. */
  playHatch(onOpen: () => void): void {
    this.hatching = true;
    this.disableInteractive();
    this.wiggleTimer?.remove(false);
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setY(0).setAlpha(1).setAngle(0);
    this.scene.tweens.add({
      targets: this.sprite,
      angle: { from: -14, to: 14 },
      duration: ANIM.hatchShakeMs,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        onOpen();
        this.scene.tweens.add({
          targets: this,
          scale: 1.35,
          alpha: 0,
          duration: 160,
          ease: 'Quad.easeOut',
          onComplete: () => this.destroy(),
        });
      },
    });
  }

  override destroy(fromScene?: boolean): void {
    this.wiggleTimer?.remove(false);
    this.scene?.tweens.killTweensOf([this, this.sprite, this.shadow]);
    super.destroy(fromScene);
  }
}
