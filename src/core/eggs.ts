import { BALANCE } from '../config/balance.ts';
import { markDiscovered } from './discovery.ts';
import { eggFloor, findEntity, findSpawnPosition, isFloorFull } from './field.ts';
import { hatchLevel } from './levels.ts';
import type { Rng } from './rng.ts';
import { allocateId } from './state.ts';
import type { Creature, Egg, EntityId, GameState } from './types.ts';

/** Crea un huevo en un lugar libre del piso. Null si el piso está lleno. */
export function spawnEgg(state: GameState, floor: number, rng: Rng): Egg | null {
  const target = state.floors[floor];
  if (!target || isFloorFull(state, floor)) return null;
  const position = findSpawnPosition(state, floor, rng);
  const egg: Egg = { kind: 'egg', id: allocateId(state), x: position.x, y: position.y };
  target.entities.push(egg);
  return egg;
}

/**
 * Avanza el temporizador de huevos. Al cumplirse cae un huevo en el piso de los huevos (`eggFloor`).
 * Si ese piso está lleno, el temporizador queda retenido y el huevo cae apenas haya lugar.
 */
export function tickEggs(state: GameState, dtMs: number, rng: Rng): { floor: number; egg: Egg } | null {
  const interval = BALANCE.EGG_INTERVAL_MS;
  state.eggTimerMs += dtMs;
  if (state.eggTimerMs < interval) return null;
  const floor = eggFloor(state);
  const egg = spawnEgg(state, floor, rng);
  // A lo sumo un huevo por tick; el sobrante se conserva, acotado a un intervalo.
  state.eggTimerMs = egg ? Math.min(state.eggTimerMs - interval, interval) : interval;
  return egg ? { floor, egg } : null;
}

export interface HatchResult {
  floor: number;
  eggId: EntityId;
  creature: Creature;
  discovered: boolean;
}

/** Abre un huevo: en su lugar aparece la criatura tier 1 de ese piso. */
export function hatchEgg(state: GameState, eggId: EntityId): HatchResult | null {
  const location = findEntity(state, eggId);
  if (!location || location.entity.kind !== 'egg') return null;
  const { floor, index, entity: egg } = location;
  const creature: Creature = {
    kind: 'creature',
    id: allocateId(state),
    level: hatchLevel(floor),
    x: egg.x,
    y: egg.y,
    payoutMs: 0,
  };
  state.floors[floor].entities[index] = creature;
  const discovered = markDiscovered(state, creature.level);
  return { floor, eggId, creature, discovered };
}
