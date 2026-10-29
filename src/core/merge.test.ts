import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { isFloorUnlocked } from './field.ts';
import { mergeCreatures } from './merge.ts';
import { mulberry32 } from './rng.ts';
import { addCreature, addEgg, emptyState, fillWithCreatures } from './test-helpers.ts';

const rng = mulberry32(7);

describe('merge en el mismo piso', () => {
  it('dos iguales dan la siguiente en el lugar del destino', () => {
    const state = emptyState();
    const source = addCreature(state, 1, 0.1, 0.1);
    const target = addCreature(state, 1, 0.8, 0.6);
    const result = mergeCreatures(state, source.id, target.id, rng);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toMatchObject({ kind: 'creature', level: 2, x: 0.8, y: 0.6, payoutMs: 0 });
    expect(result.createdFloor).toBe(0);
    expect(result.floorUnlocked).toBe(false);
    expect(state.floors[0].entities).toEqual([result.created]);
  });

  it('libera un lugar del campo', () => {
    const state = emptyState();
    const [a, b] = fillWithCreatures(state, 3, BALANCE.FLOOR_CAPACITY);
    mergeCreatures(state, a.id, b.id, rng);
    expect(state.floors[0].entities).toHaveLength(BALANCE.FLOOR_CAPACITY - 1);
  });

  it('cobra en el momento lo que las dos tenían acumulado', () => {
    const state = emptyState();
    const a = addCreature(state, 2);
    const b = addCreature(state, 2, 0.3, 0.3);
    a.payoutMs = 1000;
    b.payoutMs = 2000;
    const result = mergeCreatures(state, a.id, b.id, rng);
    expect(result.ok && result.collected).toBeCloseTo(7.5);
    expect(state.coins).toBeCloseTo(7.5);
  });

  it('descubre la criatura nueva solo la primera vez', () => {
    const state = emptyState();
    const [a, b, c, d] = fillWithCreatures(state, 1, 4);
    const first = mergeCreatures(state, a.id, b.id, rng);
    const second = mergeCreatures(state, c.id, d.id, rng);
    expect(first.ok && first.discovered).toBe(true);
    expect(second.ok && second.discovered).toBe(false);
    expect(state.discovered).toEqual([2]);
  });
});

describe('merges rechazados (no tocan el estado)', () => {
  const cases = [
    {
      name: 'niveles distintos',
      reason: 'different-level',
      setup: () => {
        const state = emptyState();
        return { state, source: addCreature(state, 1).id, target: addCreature(state, 2, 0.2, 0.2).id };
      },
    },
    {
      name: 'soltar sobre un huevo',
      reason: 'not-creature',
      setup: () => {
        const state = emptyState();
        return { state, source: addCreature(state, 1).id, target: addEgg(state).id };
      },
    },
    {
      name: 'la misma criatura',
      reason: 'same-entity',
      setup: () => {
        const state = emptyState();
        const id = addCreature(state, 1).id;
        return { state, source: id, target: id };
      },
    },
    {
      name: 'una entidad que no existe',
      reason: 'not-found',
      setup: () => {
        const state = emptyState();
        return { state, source: addCreature(state, 1).id, target: 999 };
      },
    },
    {
      name: 'dos de nivel 120 (máximo)',
      reason: 'max-level',
      setup: () => {
        const state = emptyState();
        return { state, source: addCreature(state, 120).id, target: addCreature(state, 120, 0.2, 0.2).id };
      },
    },
  ] as const;

  it.each(cases)('$name → $reason', ({ setup, reason }) => {
    const { state, source, target } = setup();
    const before = structuredClone(state);
    const result = mergeCreatures(state, source, target, rng);
    expect(result).toMatchObject({ ok: false, reason });
    expect(state).toEqual(before);
  });
});

describe('merge entre pisos', () => {
  it('dos tier 6 dan el tier 1 del piso siguiente y lo desbloquean', () => {
    const state = emptyState();
    const a = addCreature(state, 6);
    const b = addCreature(state, 6, 0.2, 0.2);
    expect(isFloorUnlocked(state, 1)).toBe(false);

    const result = mergeCreatures(state, a.id, b.id, rng);
    expect(result).toMatchObject({ ok: true, floor: 0, createdFloor: 1, floorUnlocked: true, discovered: true });
    if (!result.ok) return;
    expect(result.created.level).toBe(7);
    expect(state.floors[0].entities).toHaveLength(0);
    expect(state.floors[1].entities).toEqual([result.created]);
    expect(isFloorUnlocked(state, 1)).toBe(true);
  });

  it('el segundo merge hacia arriba ya no desbloquea ni descubre', () => {
    const state = emptyState();
    const [a, b, c, d] = fillWithCreatures(state, 6, 4);
    mergeCreatures(state, a.id, b.id, rng);
    const second = mergeCreatures(state, c.id, d.id, rng);
    expect(second).toMatchObject({ ok: true, floorUnlocked: false, discovered: false });
    expect(state.floors[1].entities).toHaveLength(2);
  });

  it('si el piso de arriba está lleno, se rechaza', () => {
    const state = emptyState();
    fillWithCreatures(state, 7, BALANCE.FLOOR_CAPACITY);
    const a = addCreature(state, 6);
    const b = addCreature(state, 6, 0.2, 0.2);
    const before = structuredClone(state);
    expect(mergeCreatures(state, a.id, b.id, rng)).toEqual({ ok: false, reason: 'target-floor-full', floor: 1 });
    expect(state).toEqual(before);
  });

  it('del piso 4 al 5: 24 + 24 → 25', () => {
    const state = emptyState();
    const a = addCreature(state, 24);
    const b = addCreature(state, 24, 0.2, 0.2);
    const result = mergeCreatures(state, a.id, b.id, rng);
    expect(result).toMatchObject({ ok: true, floor: 3, createdFloor: 4, floorUnlocked: true });
  });
});
