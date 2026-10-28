import { markDiscovered } from './discovery.ts';
import { pendingCoins } from './economy.ts';
import { findEntity, findSpawnPosition, isFloorFull, isFloorUnlocked, removeEntity } from './field.ts';
import { floorOfLevel, mergeResultLevel } from './levels.ts';
import type { Rng } from './rng.ts';
import { allocateId } from './state.ts';
import type { Creature, EntityId, GameState } from './types.ts';

export type MergeFailReason =
  | 'not-found'
  | 'same-entity'
  | 'not-creature'
  | 'different-floor'
  | 'different-level'
  | 'max-level'
  | 'target-floor-full';

export type MergeResult =
  | {
      ok: true;
      /** Piso donde estaban las dos criaturas. */
      floor: number;
      sourceId: EntityId;
      targetId: EntityId;
      created: Creature;
      /** Igual a `floor`, o el piso siguiente si se fusionaron dos tier 6. */
      createdFloor: number;
      discovered: boolean;
      floorUnlocked: boolean;
      /** Monedas pendientes de las dos criaturas, cobradas al fusionar. */
      collected: number;
    }
  | { ok: false; reason: MergeFailReason; floor?: number };

/**
 * Fusiona `sourceId` (la que se arrastró) con `targetId` (sobre la que se soltó).
 * Si sale bien, quita las dos y crea la de nivel n+1: en el lugar del destino o,
 * si sube de piso, en un lugar libre del piso de arriba. Si falla, no toca el estado.
 */
export function mergeCreatures(state: GameState, sourceId: EntityId, targetId: EntityId, rng: Rng): MergeResult {
  if (sourceId === targetId) return { ok: false, reason: 'same-entity' };
  const source = findEntity(state, sourceId);
  const target = findEntity(state, targetId);
  if (!source || !target) return { ok: false, reason: 'not-found' };
  const a = source.entity;
  const b = target.entity;
  if (a.kind !== 'creature' || b.kind !== 'creature') return { ok: false, reason: 'not-creature' };
  if (source.floor !== target.floor) return { ok: false, reason: 'different-floor' };
  if (a.level !== b.level) return { ok: false, reason: 'different-level' };

  const level = mergeResultLevel(a.level);
  if (level === null) return { ok: false, reason: 'max-level' };

  const floor = source.floor;
  const createdFloor = floorOfLevel(level);
  if (createdFloor !== floor && isFloorFull(state, createdFloor)) {
    return { ok: false, reason: 'target-floor-full', floor: createdFloor };
  }

  const collected = pendingCoins(a) + pendingCoins(b);
  state.coins += collected;
  removeEntity(state, sourceId);
  removeEntity(state, targetId);

  const position = createdFloor === floor ? { x: b.x, y: b.y } : findSpawnPosition(state, createdFloor, rng);
  const created: Creature = { kind: 'creature', id: allocateId(state), level, ...position, payoutMs: 0 };
  state.floors[createdFloor].entities.push(created);

  const wasUnlocked = isFloorUnlocked(state, createdFloor);
  const discovered = markDiscovered(state, level);
  const floorUnlocked = !wasUnlocked && isFloorUnlocked(state, createdFloor);

  return { ok: true, floor, sourceId, targetId, created, createdFloor, discovered, floorUnlocked, collected };
}
