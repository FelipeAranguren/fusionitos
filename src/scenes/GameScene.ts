import Phaser from 'phaser';
import type { FloorConfig } from '../config/creatures.ts';
import { STRINGS } from '../config/strings.ts';
import { ANIM, COLORS, DEPTH, LAYOUT, SHUTTER, SIZES } from '../config/visuals.ts';
import type { GameEvents } from '../core/GameModel.ts';
import { floorConfig, tierOfLevel } from '../core/levels.ts';
import type { MergeResult } from '../core/merge.ts';
import { mulberry32 } from '../core/rng.ts';
import type { Creature, DeepReadonly, Egg, Entity, EntityId } from '../core/types.ts';
import { CreatureView } from '../view/CreatureView.ts';
import { EggView } from '../view/EggView.ts';
import { Effects } from '../view/effects.ts';
import { clampToField, toField, toWorld } from '../view/fieldSpace.ts';
import { TEXTURES, ensureDecorTexture } from '../view/textures.ts';
import { textStyle } from '../view/ui/textStyle.ts';
import type { GameContext } from './context.ts';

export interface DebugView {
  id: EntityId;
  kind: 'creature' | 'egg';
  level: number | null;
  x: number;
  y: number;
}

/**
 * El campo de un piso: crea y destruye las vistas según los eventos del modelo,
 * maneja el arrastre y avanza el tiempo del juego. Cambiar de piso reinicia la escena.
 */
export class GameScene extends Phaser.Scene {
  private readonly ctx: GameContext;
  private floorIndex = 0;
  private readonly creatures = new Map<EntityId, CreatureView>();
  private readonly eggs = new Map<EntityId, EggView>();
  private effects!: Effects;
  private dropTarget: CreatureView | null = null;
  private switching = false;
  /** Mostrando el cierre del piso: lo que tenía antes de vaciarse (en el juego ya no está). */
  private closingEntities: readonly Readonly<Entity>[] | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor(ctx: GameContext) {
    super('Game');
    this.ctx = ctx;
  }

  init(data: { floor?: number; closing?: readonly Readonly<Entity>[] }): void {
    this.floorIndex = data.floor ?? this.ctx.view.floor;
    this.closingEntities = data.closing ?? null;
    // La instancia se reutiliza al reiniciar: las vistas viejas ya las destruyó Phaser.
    this.creatures.clear();
    this.eggs.clear();
    this.dropTarget = null;
    this.switching = false;
  }

  create(): void {
    const floor = floorConfig(this.floorIndex);
    this.ctx.view.floor = this.floorIndex;
    this.cameras.main.setBackgroundColor(floor.pageColor);
    // Los bordes de la página (escritorio) y la barra del navegador (celular) toman el color del piso.
    document.body.style.backgroundColor = floor.pageColor;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', floor.pageColor);
    this.drawField(floor);
    this.effects = new Effects(this, floor.accentColor);
    this.setupDrag();
    this.subscribe();
    if (this.closingEntities) {
      // Se ve lo que había, sin poder tocarlo, hasta que baja la persiana.
      this.input.enabled = false;
      for (const entity of this.closingEntities) {
        if (entity.kind === 'egg') this.addEgg(entity, false);
        else this.addCreature(entity, 'none');
      }
      this.time.delayedCall(ANIM.floorFadeMs + ANIM.closingStartMs, () => this.playClosing());
    } else {
      this.buildViews();
    }
    this.cameras.main.fadeIn(ANIM.floorFadeMs);
  }

  update(_time: number, delta: number): void {
    this.ctx.model.tick(delta);
    // Lo que está más abajo se dibuja adelante.
    for (const view of this.creatures.values()) {
      if (!view.isDragging && !view.isMerging) view.setDepth(view.y);
    }
    for (const view of this.eggs.values()) view.setDepth(view.y);
  }

  /** Posiciones en pantalla de lo que se ve (para el hook de debug). */
  debugViews(): DebugView[] {
    return [
      ...[...this.creatures.values()].map((v) => ({ id: v.entityId, kind: 'creature' as const, level: v.level, x: v.x, y: v.y })),
      ...[...this.eggs.values()].map((v) => ({ id: v.entityId, kind: 'egg' as const, level: null, x: v.x, y: v.y })),
    ];
  }

  private drawField(floor: FloorConfig): void {
    const { field, fieldRadius } = LAYOUT;
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0x000000, 0.25).fillRoundedRect(field.x, field.y + 14, field.width, field.height, fieldRadius);
    g.fillStyle(floor.fieldColor, 1).fillRoundedRect(field.x, field.y, field.width, field.height, fieldRadius);
    g.lineStyle(10, floor.accentColor, 0.55);
    g.strokeRoundedRect(field.x + 5, field.y + 5, field.width - 10, field.height - 10, fieldRadius - 5);

    // Decoración tenue, siempre en el mismo lugar para cada piso.
    const rng = mulberry32(this.floorIndex + 1);
    for (let i = 0; i < SIZES.decorCount; i++) {
      const emoji = floor.decor[i % floor.decor.length];
      const size = SIZES.decor * (0.7 + rng() * 0.6);
      this.add
        .image(field.x + 70 + rng() * (field.width - 140), field.y + 70 + rng() * (field.height - 140), ensureDecorTexture(this, emoji))
        .setDisplaySize(size, size)
        .setAngle((rng() - 0.5) * 40)
        .setAlpha(floor.decorAlpha ?? SIZES.decorAlpha)
        .setDepth(-5);
    }
  }

  private subscribe(): void {
    const { events } = this.ctx.model;
    this.unsubscribers = [
      events.on('eggSpawned', ({ floor, egg }) => {
        if (floor === this.floorIndex) this.addEgg(egg, true);
      }),
      events.on('eggHatched', ({ floor, eggId, creature }) => {
        if (floor === this.floorIndex) this.onEggHatched(eggId, creature);
      }),
      events.on('creaturesMerged', (event) => {
        if (event.floor === this.floorIndex) this.onMerged(event);
        else if (event.createdFloor === this.floorIndex) this.addCreature(event.created, 'merge');
      }),
      events.on('creatureAdded', ({ floor, creature }) => {
        if (floor !== this.floorIndex) return;
        this.ctx.audio.play('hatchPop');
        this.addCreature(creature, 'pop');
      }),
      events.on('coinsPopped', ({ floor, entityId, amount }) => {
        const view = floor === this.floorIndex ? this.creatures.get(entityId) : undefined;
        if (!view || view.isMerging) return;
        this.effects.coinPop(view.x, view.y - SIZES.creature * 0.6, amount);
        this.ctx.audio.play('coin');
      }),
      // Al reiniciar, los pisos de arriba vuelven a bloquearse: se vuelve al piso 1.
      events.on('stateReset', () => (this.floorIndex === 0 ? this.rebuild() : this.switchFloor(0))),
      this.ctx.ui.on('selectFloor', ({ floor }) => this.switchFloor(floor)),
      this.ctx.ui.on('showClosing', ({ floor, entities }) => this.switchFloor(floor, entities)),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const unsubscribe of this.unsubscribers) unsubscribe();
      this.unsubscribers = [];
    });
  }

  /**
   * Muestra otro piso (si está abierto): fundido y la escena se reinicia con ese piso.
   * Para mostrar un cierre (`closing`) va aunque el piso ya esté cerrado, o sea este mismo.
   */
  private switchFloor(floor: number, closing?: readonly Readonly<Entity>[]): void {
    if (this.switching) return;
    if (!closing && (floor === this.floorIndex || !this.ctx.model.isFloorOpen(floor))) return;
    this.switching = true;
    this.ctx.audio.play('whoosh');
    this.input.enabled = false;
    this.cameras.main.fadeOut(ANIM.floorFadeMs, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({ floor, closing }));
  }

  /** Cierre del piso: baja una persiana sobre lo que había y queda con candado. Al final avisa a la interfaz. */
  private playClosing(): void {
    const { field, fieldRadius } = LAYOUT;
    const bottom = field.y + field.height;
    const slats = this.add.graphics();
    for (let y = field.y; y < bottom; y += SHUTTER.slatHeight) {
      slats.fillStyle(SHUTTER.color, 1).fillRect(field.x, y, field.width, SHUTTER.slatHeight);
      slats.fillStyle(SHUTTER.light, 1).fillRect(field.x, y + 4, field.width, 8);
      slats.fillStyle(SHUTTER.dark, 1).fillRect(field.x, y + SHUTTER.slatHeight - 8, field.width, 8);
    }
    slats.fillStyle(SHUTTER.frame, 1).fillRect(field.x, bottom - 44, field.width, 44);
    slats.fillStyle(SHUTTER.dark, 1).fillRoundedRect(field.x + field.width / 2 - 80, bottom - 32, 160, 18, 9);
    // Empieza arriba del campo, recortada por su borde: entra desde la caja de arriba.
    const shutter = this.add.container(0, -field.height, [slats]).setDepth(DEPTH.shutter);
    const shape = this.make.graphics({}, false);
    shape.fillStyle(0xffffff, 1).fillRoundedRect(field.x, field.y, field.width, field.height, fieldRadius);
    shutter.setMask(shape.createGeometryMask());
    const box = this.add.graphics().setDepth(DEPTH.shutter + 1).setAlpha(0);
    box.fillStyle(SHUTTER.frame, 1).fillRoundedRect(field.x - 8, field.y - 16, field.width + 16, 48, 20);
    this.tweens.add({ targets: box, alpha: 1, duration: 200 });

    this.ctx.audio.play('shutter');
    this.tweens.add({
      targets: shutter,
      y: 0,
      duration: ANIM.shutterDropMs,
      ease: 'Quad.easeIn',
      onComplete: () => this.onShutterDown(shutter),
    });
  }

  private onShutterDown(shutter: Phaser.GameObjects.Container): void {
    this.ctx.audio.play('shutterLand');
    this.cameras.main.shake(140, 0.004);
    this.tweens.add({ targets: shutter, y: -18, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    // Lo que había quedó tapado: en el juego ya no existe.
    for (const view of this.creatures.values()) view.destroy();
    for (const view of this.eggs.values()) view.destroy();
    this.creatures.clear();
    this.eggs.clear();

    const { field } = LAYOUT;
    const x = field.x + field.width / 2;
    const y = field.y + field.height / 2 - 60;
    const lock = this.add.image(x, y, TEXTURES.lock).setDepth(DEPTH.shutter + 2).setDisplaySize(SHUTTER.lockSize, SHUTTER.lockSize);
    const lockScale = lock.scaleX;
    const label = this.add.text(0, 0, STRINGS.closedSign, textStyle({ size: 52, weight: 700, color: COLORS.textDark, stroke: false }));
    label.setOrigin(0.5);
    const plateWidth = label.width + 90;
    const plate = this.add.graphics();
    plate.fillStyle(COLORS.card, 1).fillRoundedRect(-plateWidth / 2, -48, plateWidth, 96, 24);
    plate.lineStyle(6, SHUTTER.frame, 1).strokeRoundedRect(-plateWidth / 2, -48, plateWidth, 96, 24);
    const sign = this.add.container(x, y + SHUTTER.lockSize * 0.8, [plate, label]).setDepth(DEPTH.shutter + 2);
    lock.setScale(0);
    sign.setScale(0);
    const delay = 250;
    this.tweens.add({
      targets: lock,
      scale: lockScale,
      delay,
      duration: ANIM.lockPopMs,
      ease: 'Back.easeOut(2.2)',
      onStart: () => this.ctx.audio.play('lock'),
    });
    this.tweens.add({ targets: sign, scale: 1, delay: delay + 150, duration: ANIM.lockPopMs, ease: 'Back.easeOut' });
    this.time.delayedCall(delay + ANIM.lockPopMs + ANIM.closedHoldMs, () =>
      this.ctx.ui.emit('closingShown', { floor: this.floorIndex }),
    );
  }

  private buildViews(): void {
    for (const entity of this.ctx.model.state.floors[this.floorIndex].entities) {
      if (entity.kind === 'egg') this.addEgg(entity, false);
      else this.addCreature(entity, 'none');
    }
  }

  private rebuild(): void {
    for (const view of this.creatures.values()) view.destroy();
    for (const view of this.eggs.values()) view.destroy();
    this.creatures.clear();
    this.eggs.clear();
    this.dropTarget = null;
    this.buildViews();
  }

  private addEgg(egg: DeepReadonly<Egg>, falling: boolean): void {
    const position = toWorld(egg);
    const view = new EggView(this, egg.id, position.x, position.y, (tapped) => this.ctx.model.hatch(tapped.entityId));
    this.eggs.set(egg.id, view);
    if (falling) view.playDrop(() => this.ctx.audio.play('eggLand'));
    else view.startWiggle();
  }

  private addCreature(creature: DeepReadonly<Creature>, appear: 'none' | 'pop' | 'merge'): void {
    const position = toWorld(creature);
    const view = new CreatureView(this, creature.id, creature.level, position.x, position.y, (settled) =>
      this.savePosition(settled),
    );
    this.creatures.set(creature.id, view);
    if (appear === 'none') view.startWander();
    else view.playSpawn(appear === 'merge');
  }

  private onEggHatched(eggId: EntityId, creature: DeepReadonly<Creature>): void {
    const eggView = this.eggs.get(eggId);
    this.eggs.delete(eggId);
    this.ctx.audio.play('eggCrack');
    const open = () => {
      if (!this.exists(creature.id)) return;
      const position = toWorld(creature);
      this.effects.hatchBurst(position.x, position.y);
      this.ctx.audio.play('hatchPop');
      this.addCreature(creature, 'pop');
    };
    if (eggView) eggView.playHatch(open);
    else open();
  }

  private onMerged(event: GameEvents['creaturesMerged']): void {
    const source = this.creatures.get(event.sourceId);
    const target = this.creatures.get(event.targetId);
    this.creatures.delete(event.sourceId);
    this.creatures.delete(event.targetId);
    const meet = target ? { x: target.x, y: target.y } : toWorld(event.created);
    source?.playMergeInto(meet.x, meet.y);
    target?.playMergeInto(meet.x, meet.y);

    this.time.delayedCall(ANIM.mergeMoveMs + ANIM.mergeShrinkMs, () => {
      this.effects.mergeBurst(meet.x, meet.y);
      // Cuanto más alto el tier, más agudo; si sube de piso, fanfarria.
      if (event.createdFloor !== event.floor) this.ctx.audio.play('levelUp');
      else this.ctx.audio.play('merge', { semitones: (tierOfLevel(event.created.level) - 1) * 2 });
      if (event.createdFloor !== this.floorIndex) {
        this.effects.floatingText(meet.x, meet.y - SIZES.creature * 0.5, STRINGS.movedUp(event.createdFloor));
      } else if (this.exists(event.created.id)) {
        this.addCreature(event.created, 'merge');
      }
    });
  }

  private setupDrag(): void {
    this.input.dragDistanceThreshold = 8;
    this.input.on(Phaser.Input.Events.DRAG_START, (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.GameObject) => {
      if (object instanceof CreatureView) this.onDragStart(object);
    });
    this.input.on(
      Phaser.Input.Events.DRAG,
      (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
        if (object instanceof CreatureView && object.isDragging) this.onDrag(object, dragX, dragY);
      },
    );
    this.input.on(Phaser.Input.Events.DRAG_END, (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.GameObject) => {
      if (object instanceof CreatureView && object.isDragging) this.onDragEnd(object);
    });
  }

  private onDragStart(view: CreatureView): void {
    this.ctx.audio.play('pickUp');
    view.beginDrag();
    this.dropTarget = null;
    for (const other of this.matchesOf(view)) other.setHighlight('match');
  }

  private onDrag(view: CreatureView, x: number, y: number): void {
    const position = clampToField(x, y);
    view.setPosition(position.x, position.y);
    const target = this.findDropTarget(view);
    const matching = target && target.level === view.level ? target : null;
    if (matching === this.dropTarget) return;
    this.dropTarget?.setHighlight('match');
    matching?.setHighlight('target');
    this.dropTarget = matching;
  }

  private onDragEnd(view: CreatureView): void {
    for (const other of this.creatures.values()) other.setHighlight('none');
    this.dropTarget = null;

    const { model } = this.ctx;
    const target = this.findDropTarget(view);
    if (target && target.level === view.level) {
      // El destino puede estar a mitad de un paso: la fusión ocurre donde se lo ve.
      this.savePosition(target);
      const result = model.merge(view.entityId, target.entityId);
      if (result.ok) return; // Las animaciones y el sonido los dispara el evento creaturesMerged.
      this.notifyMergeFailure(result);
    } else {
      this.ctx.audio.play('drop');
    }
    view.endDrag();
    this.savePosition(view);
  }

  /** La criatura más cercana dentro del radio de captura (de cualquier nivel). */
  private findDropTarget(view: CreatureView): CreatureView | null {
    let best: CreatureView | null = null;
    let bestDistance: number = SIZES.dropRadius;
    for (const other of this.creatures.values()) {
      if (other === view || other.isMerging) continue;
      const distance = Phaser.Math.Distance.Between(view.x, view.y, other.x, other.y);
      if (distance < bestDistance) {
        best = other;
        bestDistance = distance;
      }
    }
    return best;
  }

  private matchesOf(view: CreatureView): CreatureView[] {
    return [...this.creatures.values()].filter((other) => other !== view && !other.isMerging && other.level === view.level);
  }

  private notifyMergeFailure(result: Extract<MergeResult, { ok: false }>): void {
    this.ctx.audio.play('denied');
    if (result.reason === 'max-level') this.ctx.ui.emit('toast', { text: STRINGS.maxLevel });
    if (result.reason === 'target-floor-full') {
      this.ctx.ui.emit('toast', { text: STRINGS.floorFull(result.floor ?? this.floorIndex + 1) });
    }
  }

  private savePosition(view: CreatureView): void {
    const position = toField(view.x, view.y);
    this.ctx.model.move(view.entityId, position.x, position.y);
  }

  private exists(id: EntityId): boolean {
    return this.ctx.model.state.floors.some((floor) => floor.entities.some((entity) => entity.id === id));
  }
}
