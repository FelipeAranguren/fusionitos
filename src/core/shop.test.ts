import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { mulberry32 } from './rng.ts';
import { buyCreature, checkPurchase, creaturePrice, maxBuyableLevel, priceOf, purchasesOf } from './shop.ts';
import { addCreature, emptyState, fillWithCreatures } from './test-helpers.ts';

const rng = mulberry32(21);

/** Estado con las criaturas 1..maxLevel descubiertas y monedas de sobra. */
function richState(maxLevel: number, coins = 1e12) {
  const state = emptyState();
  state.discovered = Array.from({ length: maxLevel }, (_, i) => i + 1);
  state.coins = coins;
  return state;
}

describe('precio de la tienda', () => {
  it('sigue 15 × 3^(n−1) × 1.15^k', () => {
    expect(creaturePrice(1, 0)).toBe(15);
    expect(creaturePrice(2, 0)).toBe(45);
    expect(creaturePrice(10, 0)).toBe(15 * 3 ** 9);
    expect(creaturePrice(1, 1)).toBeCloseTo(17.25);
    expect(creaturePrice(3, 2)).toBeCloseTo(135 * 1.15 ** 2);
  });

  it('cada compra encarece solo esa criatura', () => {
    const state = richState(5);
    buyCreature(state, 1, rng);
    expect(purchasesOf(state, 1)).toBe(1);
    expect(priceOf(state, 1)).toBeCloseTo(17.25);
    expect(priceOf(state, 2)).toBe(45);
  });
});

describe('qué se vende', () => {
  it('hasta 2 niveles por debajo de la máxima descubierta', () => {
    expect(maxBuyableLevel(richState(0))).toBe(0);
    expect(maxBuyableLevel(richState(2))).toBe(0);
    expect(maxBuyableLevel(richState(3))).toBe(1);
    expect(maxBuyableLevel(richState(30))).toBe(28);
  });

  it('rechaza lo bloqueado, lo inválido, el piso lleno y la falta de monedas', () => {
    const state = richState(4);
    expect(checkPurchase(state, 3)).toEqual({ ok: false, reason: 'locked' });
    expect(checkPurchase(state, 0)).toEqual({ ok: false, reason: 'invalid-level' });
    expect(checkPurchase(state, 31)).toEqual({ ok: false, reason: 'invalid-level' });
    expect(checkPurchase(state, 2)).toEqual({ ok: true, price: 45, floor: 0 });

    state.coins = 44;
    expect(checkPurchase(state, 2)).toEqual({ ok: false, reason: 'not-enough-coins' });

    state.coins = 1000;
    fillWithCreatures(state, 1, BALANCE.FLOOR_CAPACITY);
    expect(checkPurchase(state, 2)).toEqual({ ok: false, reason: 'floor-full' });
  });

  it('con el precio justo alcanza', () => {
    const state = richState(3, 15);
    expect(buyCreature(state, 1, rng).ok).toBe(true);
    expect(state.coins).toBe(0);
  });
});

describe('comprar', () => {
  it('cobra, cuenta la compra y pone la criatura en su piso', () => {
    const state = richState(10, 1000);
    const result = buyCreature(state, 2, rng);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result).toMatchObject({ floor: 0, price: 45 });
    expect(result.creature).toMatchObject({ kind: 'creature', level: 2, payoutMs: 0 });
    expect(state.coins).toBe(955);
    expect(state.floors[0].entities).toEqual([result.creature]);
  });

  it('una criatura de un piso de arriba aparece en ese piso', () => {
    const state = richState(12);
    addCreature(state, 1);
    const result = buyCreature(state, 8, rng);
    expect(result.ok && result.floor).toBe(1);
    expect(state.floors[1].entities.map((e) => e.kind === 'creature' && e.level)).toEqual([8]);
    expect(state.floors[0].entities).toHaveLength(1);
  });

  it('si falla, no toca el estado', () => {
    const state = richState(4, 10);
    const before = structuredClone(state);
    expect(buyCreature(state, 2, rng)).toEqual({ ok: false, reason: 'not-enough-coins' });
    expect(state).toEqual(before);
  });
});
