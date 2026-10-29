import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { mulberry32 } from './rng.ts';
import { buyCreature, checkPurchase, creaturePrice, maxBuyableLevel, priceOf, purchasesOf } from './shop.ts';
import { addCreature, emptyState, fillWithCreatures } from './test-helpers.ts';

const rng = mulberry32(21);
const { SHOP_BASE_PRICE: BASE, SHOP_PRICE_GROWTH: GROWTH, SHOP_PURCHASE_GROWTH: PER_PURCHASE } = BALANCE;
/** Precio sin compras previas, según la fórmula del diseño. */
const base = (level: number) => BASE * GROWTH ** (level - 1);

/** Estado con las criaturas 1..maxLevel descubiertas y monedas de sobra. */
function richState(maxLevel: number, coins = 1e12) {
  const state = emptyState();
  state.discovered = Array.from({ length: maxLevel }, (_, i) => i + 1);
  state.coins = coins;
  return state;
}

describe('precio de la tienda', () => {
  it('sigue SHOP_BASE_PRICE × SHOP_PRICE_GROWTH^(n−1) × SHOP_PURCHASE_GROWTH^k', () => {
    expect(creaturePrice(1, 0)).toBe(BASE);
    expect(creaturePrice(2, 0)).toBeCloseTo(BASE * GROWTH);
    expect(creaturePrice(10, 0)).toBeCloseTo(base(10));
    expect(creaturePrice(1, 1)).toBeCloseTo(BASE * PER_PURCHASE);
    expect(creaturePrice(3, 2)).toBeCloseTo(base(3) * PER_PURCHASE ** 2);
  });

  it('el precio crece apenas más rápido que el ingreso: los pisos se van haciendo más largos, sin trabarse', () => {
    expect(GROWTH).toBeGreaterThan(BALANCE.INCOME_GROWTH);
    expect(GROWTH / BALANCE.INCOME_GROWTH).toBeLessThan(1.05);
  });

  it('cada compra encarece solo esa criatura', () => {
    const state = richState(5);
    buyCreature(state, 1, rng);
    expect(purchasesOf(state, 1)).toBe(1);
    expect(priceOf(state, 1)).toBeCloseTo(BASE * PER_PURCHASE);
    expect(priceOf(state, 2)).toBeCloseTo(base(2));
  });
});

describe('qué se vende', () => {
  it('hasta 2 niveles por debajo de la máxima descubierta', () => {
    expect(maxBuyableLevel(richState(0))).toBe(0);
    expect(maxBuyableLevel(richState(2))).toBe(0);
    expect(maxBuyableLevel(richState(3))).toBe(1);
    expect(maxBuyableLevel(richState(30))).toBe(28);
    expect(maxBuyableLevel(richState(120))).toBe(118);
  });

  it('rechaza lo bloqueado, lo inválido, el piso lleno y la falta de monedas', () => {
    const state = richState(4);
    expect(checkPurchase(state, 3)).toEqual({ ok: false, reason: 'locked' });
    expect(checkPurchase(state, 0)).toEqual({ ok: false, reason: 'invalid-level' });
    expect(checkPurchase(state, 121)).toEqual({ ok: false, reason: 'invalid-level' });
    expect(checkPurchase(state, 2)).toMatchObject({ ok: true, floor: 0 });

    state.coins = base(2) - 1;
    expect(checkPurchase(state, 2)).toEqual({ ok: false, reason: 'not-enough-coins' });

    state.coins = 1e6;
    fillWithCreatures(state, 1, BALANCE.FLOOR_CAPACITY);
    expect(checkPurchase(state, 2)).toEqual({ ok: false, reason: 'floor-full' });
  });

  it('con el precio justo alcanza', () => {
    const state = richState(3, BASE);
    expect(buyCreature(state, 1, rng).ok).toBe(true);
    expect(state.coins).toBe(0);
  });
});

describe('comprar', () => {
  it('cobra, cuenta la compra y pone la criatura en su piso', () => {
    const state = richState(10, 1e6);
    const result = buyCreature(state, 2, rng);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.floor).toBe(0);
    expect(result.price).toBeCloseTo(base(2));
    expect(result.creature).toMatchObject({ kind: 'creature', level: 2, payoutMs: 0 });
    expect(state.coins).toBeCloseTo(1e6 - base(2));
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
