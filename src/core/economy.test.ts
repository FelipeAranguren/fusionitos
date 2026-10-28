import { describe, expect, it } from 'vitest';
import { incomePerSecond, payoutAmount, pendingCoins, tickIncome, totalIncomePerSecond } from './economy.ts';
import { MAX_LEVEL } from './levels.ts';
import { addCreature, addEgg, emptyState } from './test-helpers.ts';

describe('ingreso por criatura', () => {
  it('sigue ingreso(n) = 1 × 2.5^(n−1)', () => {
    expect(incomePerSecond(1)).toBe(1);
    expect(incomePerSecond(2)).toBe(2.5);
    expect(incomePerSecond(3)).toBe(6.25);
    expect(incomePerSecond(7)).toBe(244.140625);
    expect(incomePerSecond(30)).toBeCloseTo(2.5 ** 29, 0);
  });

  it('fusionar siempre conviene: una de nivel n+1 produce más que dos de nivel n', () => {
    for (let n = 1; n < MAX_LEVEL; n++) {
      expect(incomePerSecond(n + 1)).toBeGreaterThan(2 * incomePerSecond(n));
    }
  });

  it('cada pulso suelta el ingreso de 3 segundos', () => {
    expect(payoutAmount(1)).toBe(3);
    expect(payoutAmount(2)).toBe(7.5);
  });

  it('pendingCoins es lo producido desde el último pulso', () => {
    const state = emptyState();
    const creature = addCreature(state, 2);
    creature.payoutMs = 1200;
    expect(pendingCoins(creature)).toBeCloseTo(3);
  });
});

describe('ingreso total', () => {
  it('suma las criaturas de todos los pisos e ignora los huevos', () => {
    const state = emptyState();
    addCreature(state, 1);
    addCreature(state, 2);
    addEgg(state);
    addCreature(state, 7); // piso 2
    expect(totalIncomePerSecond(state)).toBe(1 + 2.5 + 244.140625);
  });

  it('un campo vacío no produce nada', () => {
    expect(totalIncomePerSecond(emptyState())).toBe(0);
  });
});

describe('pulsos de monedas (tickIncome)', () => {
  it('cada criatura suelta lo producido cada 3 s', () => {
    const state = emptyState();
    const creature = addCreature(state, 2);
    expect(tickIncome(state, 2999)).toEqual([]);
    expect(state.coins).toBe(0);
    expect(tickIncome(state, 1)).toEqual([{ floor: 0, entityId: creature.id, amount: 7.5 }]);
    expect(state.coins).toBe(7.5);
    expect(creature.payoutMs).toBe(0);
  });

  it('en promedio produce exactamente ingreso(n) por segundo', () => {
    const state = emptyState();
    addCreature(state, 3);
    addCreature(state, 1, 0.2, 0.2);
    for (let i = 0; i < 600; i++) tickIncome(state, 100); // 60 s
    expect(state.coins).toBeCloseTo(60 * (6.25 + 1));
  });

  it('un dt largo junta varios ciclos en un solo pulso', () => {
    const state = emptyState();
    const creature = addCreature(state, 1);
    expect(tickIncome(state, 9500)).toEqual([{ floor: 0, entityId: creature.id, amount: 9 }]);
    expect(creature.payoutMs).toBe(500);
  });

  it('los huevos no producen', () => {
    const state = emptyState();
    addEgg(state);
    expect(tickIncome(state, 10_000)).toEqual([]);
    expect(state.coins).toBe(0);
  });

  it('las criaturas de pisos superiores también producen', () => {
    const state = emptyState();
    const creature = addCreature(state, 7);
    expect(tickIncome(state, 3000)).toEqual([{ floor: 1, entityId: creature.id, amount: 244.140625 * 3 }]);
  });
});
