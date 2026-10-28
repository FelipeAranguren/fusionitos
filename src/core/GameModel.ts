import { BALANCE } from '../config/balance.ts';
import { isDiscovered, markDiscovered, maxDiscoveredLevel } from './discovery.ts';
import { tickIncome, totalIncomePerSecond, type CoinPop } from './economy.ts';
import { hatchEgg, spawnEgg, tickEggs } from './eggs.ts';
import { Emitter } from './emitter.ts';
import { clamp01, findEntity, findSpawnPosition, floorEntityCount, isFloorFull, isFloorUnlocked } from './field.ts';
import { floorOfLevel, isValidLevel } from './levels.ts';
import { mergeCreatures, type MergeResult } from './merge.ts';
import type { Rng } from './rng.ts';
import { allocateId, createInitialState } from './state.ts';
import type { Creature, DeepReadonly, Egg, EntityId, GameState } from './types.ts';

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
  /** Una criatura apareció por otra vía que no es huevo ni merge (hoy: debug; en F3: compras). */
  creatureAdded: { floor: number; creature: Readonly<Creature> };
  coinsPopped: CoinPop;
  creatureDiscovered: { level: number };
  floorUnlocked: { floor: number };
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

  floorCount(floor: number): number {
    return floorEntityCount(this.current, floor);
  }

  isFloorFull(floor: number): boolean {
    return isFloorFull(this.current, floor);
  }

  isFloorUnlocked(floor: number): boolean {
    return isFloorUnlocked(this.current, floor);
  }

  isDiscovered(level: number): boolean {
    return isDiscovered(this.current, level);
  }

  /** Avanza el tiempo: temporizador de huevos y producción de monedas. */
  tick(dtMs: number): void {
    const dt = Math.min(Math.max(dtMs, 0), BALANCE.MAX_TICK_MS);
    if (dt === 0) return;
    const egg = tickEggs(this.current, dt, this.rng);
    if (egg) this.events.emit('eggSpawned', { floor: BALANCE.EGG_FLOOR, egg });
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
    return result;
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

  // --- Ayudas de desarrollo (las expone el hook de debug, solo en dev) ---

  /** Hace caer un huevo ya mismo, sin esperar el temporizador. */
  debugSpawnEgg(floor: number = BALANCE.EGG_FLOOR): Egg | null {
    const egg = spawnEgg(this.current, floor, this.rng);
    if (egg) this.events.emit('eggSpawned', { floor, egg });
    return egg;
  }

  /** Agrega una criatura en su piso, si hay lugar. La marca descubierta sin popup. */
  debugAddCreature(level: number): Creature | null {
    if (!isValidLevel(level)) return null;
    const floor = floorOfLevel(level);
    if (isFloorFull(this.current, floor)) return null;
    const position = findSpawnPosition(this.current, floor, this.rng);
    const creature: Creature = { kind: 'creature', id: allocateId(this.current), level, ...position, payoutMs: 0 };
    this.current.floors[floor].entities.push(creature);
    markDiscovered(this.current, level);
    this.events.emit('creatureAdded', { floor, creature });
    return creature;
  }
}
