import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { hatchEgg, spawnEgg, tickEggs } from './eggs.ts';
import { eggFloor } from './field.ts';
import { hatchLevel } from './levels.ts';
import { mulberry32 } from './rng.ts';
import { createInitialState } from './state.ts';
import { addCreature, addEgg, emptyState, fillWithCreatures } from './test-helpers.ts';

describe('caída de huevos', () => {
  it('cae un huevo cada 5 s en el piso 1', () => {
    const state = emptyState();
    const rng = mulberry32(1);
    expect(tickEggs(state, 4999, rng)).toBeNull();
    const spawned = tickEggs(state, 1, rng);
    expect(spawned).toMatchObject({ floor: 0, egg: { kind: 'egg' } });
    expect(state.floors[0].entities).toEqual([spawned?.egg]);
    expect(state.eggTimerMs).toBe(0);
    for (let i = 0; i < 5; i++) tickEggs(state, 1000, rng);
    expect(state.floors[0].entities).toHaveLength(2);
  });

  it('en una partida nueva el primer huevo cae al segundo', () => {
    const state = createInitialState();
    const rng = mulberry32(2);
    expect(tickEggs(state, BALANCE.FIRST_EGG_DELAY_MS - 1, rng)).toBeNull();
    expect(tickEggs(state, 1, rng)).not.toBeNull();
  });

  it('con el campo lleno (12 entre criaturas y huevos) no cae nada y el temporizador queda retenido', () => {
    const state = emptyState();
    const rng = mulberry32(3);
    fillWithCreatures(state, 1, 6);
    for (let i = 0; i < 6; i++) addEgg(state, 0, i / 6, 0.9);
    expect(state.floors[0].entities).toHaveLength(BALANCE.FLOOR_CAPACITY);

    expect(tickEggs(state, 5000, rng)).toBeNull();
    expect(tickEggs(state, 60_000, rng)).toBeNull();
    expect(state.floors[0].entities).toHaveLength(BALANCE.FLOOR_CAPACITY);
    expect(state.eggTimerMs).toBe(BALANCE.EGG_INTERVAL_MS);

    // Se libera un lugar: el huevo retenido cae en el próximo tick.
    state.floors[0].entities.pop();
    expect(tickEggs(state, 16, rng)).not.toBeNull();
    expect(state.floors[0].entities).toHaveLength(BALANCE.FLOOR_CAPACITY);
    expect(state.eggTimerMs).toBe(16);
  });

  it('spawnEgg ubica los huevos dentro del campo, con ids únicos, hasta llenar el piso', () => {
    const state = emptyState();
    const rng = mulberry32(4);
    const eggs = Array.from({ length: BALANCE.FLOOR_CAPACITY }, () => spawnEgg(state, 0, rng));
    for (const egg of eggs) {
      expect(egg).not.toBeNull();
      expect(egg?.x).toBeGreaterThanOrEqual(0);
      expect(egg?.x).toBeLessThanOrEqual(1);
      expect(egg?.y).toBeGreaterThanOrEqual(0);
      expect(egg?.y).toBeLessThanOrEqual(1);
    }
    expect(new Set(eggs.map((egg) => egg?.id)).size).toBe(BALANCE.FLOOR_CAPACITY);
    expect(spawnEgg(state, 0, rng)).toBeNull();
  });

  it('un huevo nuevo cae lejos de las demás entidades', () => {
    const state = emptyState();
    addCreature(state, 1, 0.1, 0.1);
    addCreature(state, 1, 0.9, 0.9);
    const egg = spawnEgg(state, 0, mulberry32(5));
    const nearest = Math.min(Math.hypot((egg?.x ?? 0) - 0.1, (egg?.y ?? 0) - 0.1), Math.hypot((egg?.x ?? 0) - 0.9, (egg?.y ?? 0) - 0.9));
    expect(nearest).toBeGreaterThan(0.3);
  });
});

describe('piso de los huevos (2 por debajo del más alto desbloqueado)', () => {
  /** Desbloquea hasta el piso `floor` (índice): se descubre su tier 1. */
  const unlockUpTo = (state: ReturnType<typeof emptyState>, floor: number) => {
    for (let f = 1; f <= floor; f++) state.discovered.push(hatchLevel(f));
  };

  it('hasta el Piso 3 caen en el Piso 1', () => {
    const state = emptyState();
    expect(eggFloor(state)).toBe(0);
    unlockUpTo(state, 2);
    expect(eggFloor(state)).toBe(0);
  });

  it('con el Piso 4 desbloqueado caen en el Piso 2; con el 10, en el 8', () => {
    const state = emptyState();
    unlockUpTo(state, 3);
    expect(eggFloor(state)).toBe(1);
    unlockUpTo(state, 9);
    expect(eggFloor(state)).toBe(7);
  });

  it('el huevo cae en ese piso y de él sale el tier 1 de ese piso', () => {
    const state = emptyState();
    unlockUpTo(state, 3);
    const spawned = tickEggs(state, 5000, mulberry32(8));
    expect(spawned?.floor).toBe(1);
    expect(state.floors[1].entities).toEqual([spawned?.egg]);
    expect(state.floors[0].entities).toHaveLength(0);
    const hatched = hatchEgg(state, spawned?.egg.id ?? -1);
    expect(hatched?.creature.level).toBe(7); // Pollito
  });

  it('si ese piso está lleno, se espera: no caen en otro', () => {
    const state = emptyState();
    unlockUpTo(state, 3);
    fillWithCreatures(state, 7, BALANCE.FLOOR_CAPACITY);
    expect(tickEggs(state, 60_000, mulberry32(9))).toBeNull();
    expect(state.floors[0].entities).toHaveLength(0);
    expect(state.eggTimerMs).toBe(BALANCE.EGG_INTERVAL_MS);
  });

  it('un huevo viejo de un piso de abajo da el tier 1 de su piso', () => {
    const state = emptyState();
    const oldEgg = addEgg(state, 0);
    unlockUpTo(state, 9);
    expect(hatchEgg(state, oldEgg.id)?.creature.level).toBe(1);
  });
});

describe('abrir huevos', () => {
  it('sale la criatura tier 1 del piso en la posición del huevo', () => {
    const state = emptyState();
    const egg = addEgg(state, 0, 0.3, 0.7);
    const result = hatchEgg(state, egg.id);
    expect(result?.creature).toMatchObject({ kind: 'creature', level: 1, x: 0.3, y: 0.7, payoutMs: 0 });
    expect(result?.creature.id).not.toBe(egg.id);
    expect(state.floors[0].entities).toEqual([result?.creature]);
  });

  it('la primera criatura se descubre una sola vez', () => {
    const state = emptyState();
    const first = addEgg(state);
    const second = addEgg(state, 0, 0.2, 0.2);
    expect(hatchEgg(state, first.id)?.discovered).toBe(true);
    expect(hatchEgg(state, second.id)?.discovered).toBe(false);
    expect(state.discovered).toEqual([1]);
  });

  it('no abre algo que no es un huevo', () => {
    const state = emptyState();
    const creature = addCreature(state, 1);
    expect(hatchEgg(state, creature.id)).toBeNull();
    expect(hatchEgg(state, 999)).toBeNull();
  });
});
