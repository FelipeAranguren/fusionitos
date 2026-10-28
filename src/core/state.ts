import { BALANCE } from '../config/balance.ts';
import { FLOOR_COUNT } from './levels.ts';
import type { EntityId, GameState } from './types.ts';

export function createInitialState(): GameState {
  return {
    coins: 0,
    floors: Array.from({ length: FLOOR_COUNT }, () => ({ entities: [] })),
    discovered: [],
    eggTimerMs: BALANCE.EGG_INTERVAL_MS - BALANCE.FIRST_EGG_DELAY_MS,
    nextId: 1,
  };
}

export function allocateId(state: GameState): EntityId {
  const id = state.nextId;
  state.nextId += 1;
  return id;
}
