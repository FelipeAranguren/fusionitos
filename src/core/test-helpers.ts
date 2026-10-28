import { floorOfLevel } from './levels.ts';
import { allocateId, createInitialState } from './state.ts';
import type { Creature, Egg, GameState } from './types.ts';

/** Solo para tests: estado vacío con el temporizador de huevos en 0. */
export function emptyState(): GameState {
  const state = createInitialState();
  state.eggTimerMs = 0;
  return state;
}

export function addCreature(state: GameState, level: number, x = 0.5, y = 0.5): Creature {
  const creature: Creature = { kind: 'creature', id: allocateId(state), level, x, y, payoutMs: 0 };
  state.floors[floorOfLevel(level)].entities.push(creature);
  return creature;
}

export function addEgg(state: GameState, floor = 0, x = 0.5, y = 0.5): Egg {
  const egg: Egg = { kind: 'egg', id: allocateId(state), x, y };
  state.floors[floor].entities.push(egg);
  return egg;
}

/** Llena un piso hasta `count` entidades con criaturas de `level` (en posiciones distintas). */
export function fillWithCreatures(state: GameState, level: number, count: number): Creature[] {
  return Array.from({ length: count }, (_, i) => addCreature(state, level, (i % 4) / 4, Math.floor(i / 4) / 4));
}
