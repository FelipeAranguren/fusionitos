import Phaser from 'phaser';
import type { FloorConfig } from '../config/creatures.ts';
import { STRINGS } from '../config/strings.ts';
import { ANIM, LAYOUT, SIZES } from '../config/visuals.ts';
import type { GameEvents } from '../core/GameModel.ts';
import { floorConfig } from '../core/levels.ts';
import type { MergeResult } from '../core/merge.ts';
import { mulberry32 } from '../core/rng.ts';
import type { Creature, DeepReadonly, Egg, EntityId } from '../core/types.ts';
import { CreatureView } from '../view/CreatureView.ts';
import { EggView } from '../view/EggView.ts';
import { Effects } from '../view/effects.ts';
import { clampToField, toField, toWorld } from '../view/fieldSpace.ts';
import { decorTextureKey } from '../view/textures.ts';
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
 * maneja el arrastre y avanza el tiempo del juego.
 */
export class GameScene extends Phaser.Scene {
  private readonly ctx: GameContext;
  /** F1: siempre el piso 1. La navegación entre pisos es de F2. */
  private readonly floorIndex = 0;
  private readonly creatures = new Map<EntityId, CreatureView>();
  private readonly eggs = new Map<EntityId, EggView>();
  private effects!: Effects;
  private dropTarget: CreatureView | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor(ctx: GameContext) {
    super('Game');
    this.ctx = ctx;
  }

  create(): void {
    const floor = floorConfig(this.floorIndex);
    this.cameras.main.setBackgroundColor(floor.pageColor);
    this.drawField(floor);
    this.effects = new Effects(this, floor.accentColor);
    this.setupDrag();
    this.subscribe();
    this.buildViews();
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
        .image(field.x + 70 + rng() * (field.width - 140), field.y + 70 + rng() * (field.height - 140), decorTextureKey(emoji))
        .setDisplaySize(size, size)
        .setAngle((rng() - 0.5) * 40)
        .setAlpha(0.35)
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
        if (floor === this.floorIndex) this.addCreature(creature, 'pop');
      }),
      events.on('coinsPopped', ({ floor, entityId, amount }) => {
        const view = floor === this.floorIndex ? this.creatures.get(entityId) : undefined;
        if (view && !view.isMerging) this.effects.coinPop(view.x, view.y - SIZES.creature * 0.6, amount);
      }),
      events.on('stateReset', () => this.rebuild()),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const unsubscribe of this.unsubscribers) unsubscribe();
      this.unsubscribers = [];
    });
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
    if (falling) view.playDrop();
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
    const open = () => {
      if (!this.exists(creature.id)) return;
      const position = toWorld(creature);
      this.effects.hatchBurst(position.x, position.y);
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
      if (result.ok) return; // Las animaciones las dispara el evento creaturesMerged.
      this.notifyMergeFailure(result);
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
