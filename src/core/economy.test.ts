import { describe, expect, it } from 'vitest';
import {
  incomePerSecond,
  offlineEarnings,
  payoutAmount,
  pendingCoins,
  tickIncome,
  totalIncomePerSecond,
} from './economy.ts';
import { MAX_LEVEL } from './levels.ts';
import { addCreature, addEgg, emptyState } from './test-helpers.ts';

describe('ingreso por criatura', () => {
  it('sigue ingreso(n) = 0.8 × 2.5^(n−1)', () => {
    expect(incomePerSecond(1)).toBeCloseTo(0.8);
    expect(incomePerSecond(2)).toBeCloseTo(2);
    expect(incomePerSecond(3)).toBeCloseTo(5);
    expect(incomePerSecond(7)).toBeCloseTo(195.3125);
    expect(incomePerSecond(30)).toBeCloseTo(0.8 * 2.5 ** 29, 0);
  });

  it('fusionar siempre conviene: una de nivel n+1 produce más que dos de nivel n', () => {
    for (let n = 1; n < MAX_LEVEL; n++) {
      expect(incomePerSecond(n + 1)).toBeGreaterThan(2 * incomePerSecond(n));
    }
  });

  it('cada pulso suelta el ingreso de 3 segundos', () => {
    expect(payoutAmount(1)).toBeCloseTo(2.4);
    expect(payoutAmount(2)).toBeCloseTo(6);
  });

  it('pendingCoins es lo producido desde el último pulso', () => {
    const state = emptyState();
    const creature = addCreature(state, 2);
    creature.payoutMs = 1200;
    expect(pendingCoins(creature)).toBeCloseTo(2.4);
  });
});

describe('ingreso total', () => {
  it('suma las criaturas de todos los pisos e ignora los huevos', () => {
    const state = emptyState();
    addCreature(state, 1);
    addCreature(state, 2);
    addEgg(state);
    addCreature(state, 7); // piso 2
    expect(totalIncomePerSecond(state)).toBeCloseTo(0.8 + 2 + 195.3125);
  });

  it('un campo vacío no produce nada', () => {
    expect(totalIncomePerSecond(emptyState())).toBe(0);
  });
});

describe('ingreso offline', () => {
  const HOUR = 3_600_000;

  it('es el 50 % del ingreso por el tiempo de ausencia', () => {
    const state = emptyState();
    addCreature(state, 2); // 2/s
    expect(offlineEarnings(state, HOUR)).toEqual({ amount: expect.closeTo(0.5 * 2 * 3600), awayMs: HOUR, countedMs: HOUR });
  });

  it('cuenta como máximo 4 horas', () => {
    const state = emptyState();
    addCreature(state, 1);
    const earnings = offlineEarnings(state, 10 * HOUR);
    expect(earnings).toEqual({ amount: expect.closeTo(0.5 * 0.8 * 4 * 3600), awayMs: 10 * HOUR, countedMs: 4 * HOUR });
  });

  it('una ausencia de menos de un minuto no cuenta', () => {
    const state = emptyState();
    addCreature(state, 1);
    expect(offlineEarnings(state, 59_999)).toBeNull();
    expect(offlineEarnings(state, 60_000)?.amount).toBeCloseTo(24);
  });

  it('sin criaturas, o con tiempos inválidos, no hay nada', () => {
    const state = emptyState();
    expect(offlineEarnings(state, HOUR)).toBeNull();
    addCreature(state, 1);
    expect(offlineEarnings(state, -HOUR)).toBeNull();
    expect(offlineEarnings(state, Number.NaN)).toBeNull();
  });
});

describe('pulsos de monedas (tickIncome)', () => {
  it('cada criatura suelta lo producido cada 3 s', () => {
    const state = emptyState();
    const creature = addCreature(state, 2);
    expect(tickIncome(state, 2999)).toEqual([]);
    expect(state.coins).toBe(0);
    expect(tickIncome(state, 1)).toEqual([{ floor: 0, entityId: creature.id, amount: expect.closeTo(6) }]);
    expect(state.coins).toBeCloseTo(6);
    expect(creature.payoutMs).toBe(0);
  });

  it('en promedio produce exactamente ingreso(n) por segundo', () => {
    const state = emptyState();
    addCreature(state, 3);
    addCreature(state, 1, 0.2, 0.2);
    for (let i = 0; i < 600; i++) tickIncome(state, 100); // 60 s
    expect(state.coins).toBeCloseTo(60 * (5 + 0.8));
  });

  it('un dt largo junta varios ciclos en un solo pulso', () => {
    const state = emptyState();
    const creature = addCreature(state, 1);
    expect(tickIncome(state, 9500)).toEqual([{ floor: 0, entityId: creature.id, amount: expect.closeTo(0.8 * 9) }]);
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
    expect(tickIncome(state, 3000)).toEqual([{ floor: 1, entityId: creature.id, amount: expect.closeTo(195.3125 * 3) }]);
  });
});
