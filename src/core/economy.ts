import { BALANCE } from '../config/balance.ts';
import type { Creature, DeepReadonly, EntityId, GameState } from './types.ts';

/** ingreso(n) = INCOME_BASE × INCOME_GROWTH^(n−1) monedas por segundo. */
export function incomePerSecond(level: number): number {
  return BALANCE.INCOME_BASE * BALANCE.INCOME_GROWTH ** (level - 1);
}

/** Lo que suelta una criatura en cada pulso. */
export function payoutAmount(level: number): number {
  return incomePerSecond(level) * (BALANCE.COIN_POP_INTERVAL_MS / 1000);
}

/** Producción acumulada que la criatura todavía no soltó. */
export function pendingCoins(creature: DeepReadonly<Creature>): number {
  return incomePerSecond(creature.level) * (creature.payoutMs / 1000);
}

/** Suma de todas las criaturas de todos los pisos (los huevos no producen). */
export function totalIncomePerSecond(state: DeepReadonly<GameState>): number {
  let total = 0;
  for (const floor of state.floors) {
    for (const entity of floor.entities) {
      if (entity.kind === 'creature') total += incomePerSecond(entity.level);
    }
  }
  return total;
}

export interface OfflineEarnings {
  amount: number;
  /** Tiempo real de ausencia. */
  awayMs: number;
  /** Tiempo que se tomó en cuenta (con el tope). */
  countedMs: number;
}

/**
 * Ingreso offline = OFFLINE_INCOME_RATE × ingreso total × min(ausencia, OFFLINE_MAX_HOURS).
 * Null si la ausencia es más corta que OFFLINE_MIN_SECONDS o si no hay nada que produzca.
 */
export function offlineEarnings(state: DeepReadonly<GameState>, awayMs: number): OfflineEarnings | null {
  if (!Number.isFinite(awayMs) || awayMs < BALANCE.OFFLINE_MIN_SECONDS * 1000) return null;
  const countedMs = Math.min(awayMs, BALANCE.OFFLINE_MAX_HOURS * 3_600_000);
  const amount = BALANCE.OFFLINE_INCOME_RATE * totalIncomePerSecond(state) * (countedMs / 1000);
  return amount > 0 ? { amount, awayMs, countedMs } : null;
}

export interface CoinPop {
  floor: number;
  entityId: EntityId;
  amount: number;
}

/**
 * Avanza la producción `dtMs`. Cada criatura que completa su intervalo suelta
 * lo acumulado: suma a las monedas y devuelve un pulso para mostrar el "+X".
 */
export function tickIncome(state: GameState, dtMs: number): CoinPop[] {
  const interval = BALANCE.COIN_POP_INTERVAL_MS;
  const pops: CoinPop[] = [];
  state.floors.forEach((floor, floorIndex) => {
    for (const entity of floor.entities) {
      if (entity.kind !== 'creature') continue;
      entity.payoutMs += dtMs;
      if (entity.payoutMs < interval) continue;
      const cycles = Math.floor(entity.payoutMs / interval);
      entity.payoutMs -= cycles * interval;
      const amount = cycles * payoutAmount(entity.level);
      state.coins += amount;
      pops.push({ floor: floorIndex, entityId: entity.id, amount });
    }
  });
  return pops;
}
