import { BALANCE } from '../config/balance.ts';
import { isDiscovered, markDiscovered, maxDiscoveredLevel } from './discovery.ts';
import { offlineEarnings, tickIncome, totalIncomePerSecond, type CoinPop, type OfflineEarnings } from './economy.ts';
import { hatchEgg, spawnEgg, tickEggs } from './eggs.ts';
import { Emitter } from './emitter.ts';
import {
  adjacentOpenFloor,
  clamp01,
  eggFloor,
  emptyClosedFloors,
  highestUnlockedFloor,
  findEntity,
  findSpawnPosition,
  floorEntityCount,
  isFloorClosed,
  isFloorFull,
  isFloorOpen,
  isFloorUnlocked,
} from './field.ts';
import { floorOfLevel, isValidLevel } from './levels.ts';
import { mergeCreatures, type MergeResult } from './merge.ts';
import type { Rng } from './rng.ts';
import {
  buyCreature,
  checkPurchase,
  maxBuyableLevel,
  priceOf,
  type PurchaseCheck,
  type PurchaseResult,
} from './shop.ts';
import { allocateId, createInitialState } from './state.ts';
import type { Creature, DeepReadonly, Egg, Entity, EntityId, GameState } from './types.ts';

export interface GameEvents {
  eggSpawned: { floor: number; egg: Readonly<Egg> };
  eggHatched: { floor: number; eggId: EntityId; creature: Readonly<Creature> };
  creaturesMerged: {
    floor: number;
    sourceId: EntityId;
    targetId: EntityId;
    created: Readonly<Creature>;
    createdFloor: number;
  };
  /** Una criatura apareció por otra vía que no es huevo ni merge: una compra (o el debug). */
  creatureAdded: { floor: number; creature: Readonly<Creature> };
  coinsPopped: CoinPop;
  creatureDiscovered: { level: number };
  floorUnlocked: { floor: number };
  /** Subió el piso de los huevos y este quedó cerrado: se vació (`entities`, lo que tenía). */
  floorClosed: { floor: number; entities: readonly Readonly<Entity>[] };
  stateReset: Record<string, never>;
}

/**
 * Fachada del juego y dueña del estado. Las vistas leen `state` (solo lectura),
 * llaman a los comandos y reaccionan a los eventos; nunca mutan el estado.
 */
export class GameModel {
  readonly events = new Emitter<GameEvents>();
  private current: GameState;
  private readonly rng: Rng;

  constructor(state: GameState = createInitialState(), rng: Rng = Math.random) {
    this.current = state;
    this.rng = rng;
    // Los guardados de antes de que se cerraran los pisos pueden tener criaturas en pisos ya cerrados.
    emptyClosedFloors(this.current);
  }

  get state(): DeepReadonly<GameState> {
    return this.current;
  }

  get coins(): number {
    return this.current.coins;
  }

  get incomePerSecond(): number {
    return totalIncomePerSecond(this.current);
  }

  /** 0..1 hacia el próximo huevo; 1 = listo, esperando lugar. */
  get eggProgress(): number {
    return Math.min(1, this.current.eggTimerMs / BALANCE.EGG_INTERVAL_MS);
  }

  get maxDiscoveredLevel(): number {
    return maxDiscoveredLevel(this.current);
  }

  /** Piso donde caen los huevos ahora. */
  get eggFloor(): number {
    return eggFloor(this.current);
  }

  get highestUnlockedFloor(): number {
    return highestUnlockedFloor(this.current);
  }

  floorCount(floor: number): number {
    return floorEntityCount(this.current, floor);
  }

  isFloorFull(floor: number): boolean {
    return isFloorFull(this.current, floor);
  }

  isFloorUnlocked(floor: number): boolean {
    return isFloorUnlocked(this.current, floor);
  }

  isFloorClosed(floor: number): boolean {
    return isFloorClosed(this.current, floor);
  }

  /** Desbloqueado y no cerrado: se puede ir a verlo. */
  isFloorOpen(floor: number): boolean {
    return isFloorOpen(this.current, floor);
  }

  adjacentOpenFloor(floor: number, direction: 1 | -1): number | null {
    return adjacentOpenFloor(this.current, floor, direction);
  }

  isDiscovered(level: number): boolean {
    return isDiscovered(this.current, level);
  }

  /** Avanza el tiempo: temporizador de huevos y producción de monedas. */
  tick(dtMs: number): void {
    const dt = Math.min(Math.max(dtMs, 0), BALANCE.MAX_TICK_MS);
    if (dt === 0) return;
    const spawned = tickEggs(this.current, dt, this.rng);
    if (spawned) this.events.emit('eggSpawned', spawned);
    for (const pop of tickIncome(this.current, dt)) this.events.emit('coinsPopped', pop);
  }

  hatch(eggId: EntityId): boolean {
    const result = hatchEgg(this.current, eggId);
    if (!result) return false;
    this.events.emit('eggHatched', { floor: result.floor, eggId, creature: result.creature });
    if (result.discovered) this.events.emit('creatureDiscovered', { level: result.creature.level });
    return true;
  }

  merge(sourceId: EntityId, targetId: EntityId): MergeResult {
    const eggFloorBefore = eggFloor(this.current);
    const result = mergeCreatures(this.current, sourceId, targetId, this.rng);
    if (!result.ok) return result;
    this.events.emit('creaturesMerged', {
      floor: result.floor,
      sourceId,
      targetId,
      created: result.created,
      createdFloor: result.createdFloor,
    });
    if (result.floorUnlocked) this.events.emit('floorUnlocked', { floor: result.createdFloor });
    if (result.discovered) this.events.emit('creatureDiscovered', { level: result.created.level });
    this.closeForgottenFloors(eggFloorBefore);
    return result;
  }

  /** Nivel más alto que vende la tienda (0 si ninguno). */
  get maxBuyableLevel(): number {
    return maxBuyableLevel(this.current);
  }

  priceOf(level: number): number {
    return priceOf(this.current, level);
  }

  checkPurchase(level: number): PurchaseCheck {
    return checkPurchase(this.current, level);
  }

  /** Compra en la tienda: la criatura aparece en su piso (evento creatureAdded). */
  buy(level: number): PurchaseResult {
    const result = buyCreature(this.current, level, this.rng);
    if (result.ok) this.events.emit('creatureAdded', { floor: result.floor, creature: result.creature });
    return result;
  }

  /** Suma el ingreso offline de una ausencia. Devuelve el resumen para mostrar, o null si no corresponde. */
  applyOfflineEarnings(awayMs: number): OfflineEarnings | null {
    const earnings = offlineEarnings(this.current, awayMs);
    if (earnings) this.current.coins += earnings.amount;
    return earnings;
  }

  /** Actualiza la posición normalizada de una entidad (la vista la llama al terminar un movimiento). */
  move(id: EntityId, x: number, y: number): void {
    const location = findEntity(this.current, id);
    if (!location) return;
    location.entity.x = clamp01(x);
    location.entity.y = clamp01(y);
  }

  reset(): void {
    this.current = createInitialState();
    this.events.emit('stateReset', {});
  }

  /** Si subió el piso de los huevos, cierra los que quedaron abajo: se vacían y se avisa de cada uno. */
  private closeForgottenFloors(eggFloorBefore: number): void {
    const now = eggFloor(this.current);
    if (now <= eggFloorBefore) return;
    const emptied = emptyClosedFloors(this.current);
    for (let floor = eggFloorBefore; floor < now; floor++) {
      const entities = emptied.find((item) => item.floor === floor)?.entities ?? [];
      this.events.emit('floorClosed', { floor, entities });
    }
  }

  // --- Ayudas de desarrollo (las expone el hook de debug, solo en dev) ---

  /** Hace caer un huevo ya mismo, sin esperar el temporizador. */
  debugSpawnEgg(floor: number = eggFloor(this.current)): Egg | null {
    const egg = spawnEgg(this.current, floor, this.rng);
    if (egg) this.events.emit('eggSpawned', { floor, egg });
    return egg;
  }

  debugAddCoins(amount: number): void {
    if (Number.isFinite(amount) && amount > 0) this.current.coins += amount;
  }

  /** Agrega una criatura en su piso, si hay lugar y no está cerrado. La marca descubierta sin popup. */
  debugAddCreature(level: number): Creature | null {
    if (!isValidLevel(level)) return null;
    const floor = floorOfLevel(level);
    if (isFloorFull(this.current, floor) || isFloorClosed(this.current, floor)) return null;
    const eggFloorBefore = eggFloor(this.current);
    const position = findSpawnPosition(this.current, floor, this.rng);
    const creature: Creature = { kind: 'creature', id: allocateId(this.current), level, ...position, payoutMs: 0 };
    this.current.floors[floor].entities.push(creature);
    markDiscovered(this.current, level);
    this.events.emit('creatureAdded', { floor, creature });
    this.closeForgottenFloors(eggFloorBefore);
    return creature;
  }
}
