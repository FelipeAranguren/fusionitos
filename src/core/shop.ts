import { BALANCE } from '../config/balance.ts';
import { maxDiscoveredLevel } from './discovery.ts';
import { findSpawnPosition, isFloorClosed, isFloorFull } from './field.ts';
import { floorOfLevel, isValidLevel } from './levels.ts';
import type { Rng } from './rng.ts';
import { allocateId } from './state.ts';
import type { Creature, DeepReadonly, GameState } from './types.ts';

/** precio(n, k) = SHOP_BASE_PRICE × SHOP_PRICE_GROWTH^(n−1) × SHOP_PURCHASE_GROWTH^k (k = compras previas). */
export function creaturePrice(level: number, purchases: number): number {
  return (
    BALANCE.SHOP_BASE_PRICE * BALANCE.SHOP_PRICE_GROWTH ** (level - 1) * BALANCE.SHOP_PURCHASE_GROWTH ** purchases
  );
}

/** Nivel más alto que se vende (0 si ninguno): hasta SHOP_LEVELS_BELOW_MAX por debajo del máximo descubierto. */
export function maxBuyableLevel(state: DeepReadonly<GameState>): number {
  return Math.max(0, maxDiscoveredLevel(state) - BALANCE.SHOP_LEVELS_BELOW_MAX);
}

export function purchasesOf(state: DeepReadonly<GameState>, level: number): number {
  return state.purchases[level - 1] ?? 0;
}

export function priceOf(state: DeepReadonly<GameState>, level: number): number {
  return creaturePrice(level, purchasesOf(state, level));
}

export type PurchaseFailReason = 'invalid-level' | 'locked' | 'floor-closed' | 'floor-full' | 'not-enough-coins';

export type PurchaseCheck = { ok: true; price: number; floor: number } | { ok: false; reason: PurchaseFailReason };

/** Si se puede comprar ahora. El orden de los motivos es el que se le explica al jugador. */
export function checkPurchase(state: DeepReadonly<GameState>, level: number): PurchaseCheck {
  if (!isValidLevel(level)) return { ok: false, reason: 'invalid-level' };
  if (level > maxBuyableLevel(state)) return { ok: false, reason: 'locked' };
  const floor = floorOfLevel(level);
  if (isFloorClosed(state, floor)) return { ok: false, reason: 'floor-closed' };
  if (isFloorFull(state, floor)) return { ok: false, reason: 'floor-full' };
  const price = priceOf(state, level);
  if (state.coins < price) return { ok: false, reason: 'not-enough-coins' };
  return { ok: true, price, floor };
}

export type PurchaseResult =
  | { ok: true; creature: Creature; floor: number; price: number }
  | { ok: false; reason: PurchaseFailReason };

/** Compra una criatura: cobra, cuenta la compra y la pone en un lugar libre de su piso. Si falla, no toca nada. */
export function buyCreature(state: GameState, level: number, rng: Rng): PurchaseResult {
  const check = checkPurchase(state, level);
  if (!check.ok) return check;
  state.coins -= check.price;
  state.purchases[level - 1] = purchasesOf(state, level) + 1;
  const position = findSpawnPosition(state, check.floor, rng);
  const creature: Creature = { kind: 'creature', id: allocateId(state), level, ...position, payoutMs: 0 };
  state.floors[check.floor].entities.push(creature);
  return { ok: true, creature, floor: check.floor, price: check.price };
}
