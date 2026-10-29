import { BALANCE } from '../config/balance.ts';
import { hatchLevel } from './levels.ts';
import type { Rng } from './rng.ts';
import type { DeepReadonly, Entity, EntityId, GameState, Point } from './types.ts';

export function floorEntityCount(state: DeepReadonly<GameState>, floor: number): number {
  return state.floors[floor]?.entities.length ?? 0;
}

export function isFloorFull(state: DeepReadonly<GameState>, floor: number): boolean {
  return floorEntityCount(state, floor) >= BALANCE.FLOOR_CAPACITY;
}

/** El piso 1 siempre está abierto; los demás, cuando se descubrió su tier 1. */
export function isFloorUnlocked(state: DeepReadonly<GameState>, floor: number): boolean {
  return floor === 0 || state.discovered.includes(hatchLevel(floor));
}

/** Índice del piso desbloqueado más alto. */
export function highestUnlockedFloor(state: DeepReadonly<GameState>): number {
  for (let floor = state.floors.length - 1; floor > 0; floor--) {
    if (isFloorUnlocked(state, floor)) return floor;
  }
  return 0;
}

/** Piso donde caen los huevos: EGG_FLOOR_LAG por debajo del más alto desbloqueado (mínimo, el primero). */
export function eggFloor(state: DeepReadonly<GameState>): number {
  return Math.max(0, highestUnlockedFloor(state) - BALANCE.EGG_FLOOR_LAG);
}

/** Próximo piso desbloqueado hacia arriba (1) o hacia abajo (−1), o null si no hay. */
export function adjacentUnlockedFloor(state: DeepReadonly<GameState>, floor: number, direction: 1 | -1): number | null {
  for (let candidate = floor + direction; candidate >= 0 && candidate < state.floors.length; candidate += direction) {
    if (isFloorUnlocked(state, candidate)) return candidate;
  }
  return null;
}

export interface EntityLocation {
  floor: number;
  index: number;
  entity: Entity;
}

export function findEntity(state: GameState, id: EntityId): EntityLocation | null {
  for (let floor = 0; floor < state.floors.length; floor++) {
    const entities = state.floors[floor].entities;
    const index = entities.findIndex((entity) => entity.id === id);
    if (index !== -1) return { floor, index, entity: entities[index] };
  }
  return null;
}

export function removeEntity(state: GameState, id: EntityId): Entity | null {
  const location = findEntity(state, id);
  if (!location) return null;
  state.floors[location.floor].entities.splice(location.index, 1);
  return location.entity;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Elige dónde ubicar una entidad nueva: sortea `candidates` posiciones y se queda
 * con la más alejada de las entidades del piso, para que no se amontonen.
 */
export function findSpawnPosition(
  state: DeepReadonly<GameState>,
  floor: number,
  rng: Rng,
  candidates: number = BALANCE.SPAWN_CANDIDATES,
): Point {
  const others = state.floors[floor]?.entities ?? [];
  let best: Point = { x: rng(), y: rng() };
  if (others.length === 0) return best;

  let bestScore = -1;
  for (let i = 0; i < candidates; i++) {
    const candidate = i === 0 ? best : { x: rng(), y: rng() };
    let nearest = Infinity;
    for (const other of others) {
      nearest = Math.min(nearest, (other.x - candidate.x) ** 2 + (other.y - candidate.y) ** 2);
    }
    if (nearest > bestScore) {
      bestScore = nearest;
      best = candidate;
    }
  }
  return best;
}
