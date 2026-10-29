import { describe, expect, it, vi } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { GameModel } from './GameModel.ts';
import { mulberry32 } from './rng.ts';
import { createInitialState } from './state.ts';
import { addCreature, addEgg, emptyState } from './test-helpers.ts';

function modelWith(state = emptyState()) {
  return new GameModel(state, mulberry32(11));
}

describe('GameModel', () => {
  it('tick hace caer un huevo cada 5 s y avisa con eggSpawned', () => {
    const model = modelWith();
    const spawned = vi.fn();
    model.events.on('eggSpawned', spawned);
    for (let i = 0; i < 10; i++) model.tick(1000);
    expect(spawned).toHaveBeenCalledTimes(2);
    expect(spawned).toHaveBeenLastCalledWith({ floor: 0, egg: expect.objectContaining({ kind: 'egg' }) });
    expect(model.floorCount(0)).toBe(2);
  });

  it('acota el tiempo simulado por tick', () => {
    const model = modelWith();
    model.tick(60_000);
    expect(model.eggProgress).toBeCloseTo(BALANCE.MAX_TICK_MS / BALANCE.EGG_INTERVAL_MS);
    expect(model.floorCount(0)).toBe(0);
  });

  it('emite coinsPopped con el monto de cada pulso', () => {
    const state = emptyState();
    const creature = addCreature(state, 2);
    const model = modelWith(state);
    const popped = vi.fn();
    model.events.on('coinsPopped', popped);
    for (let i = 0; i < 3; i++) model.tick(1000);
    expect(popped).toHaveBeenCalledWith({ floor: 0, entityId: creature.id, amount: expect.closeTo(6) });
    expect(model.coins).toBeCloseTo(6);
  });

  it('hatch emite eggHatched y el descubrimiento solo la primera vez', () => {
    const state = emptyState();
    const first = addEgg(state);
    const second = addEgg(state, 0, 0.1, 0.1);
    const model = modelWith(state);
    const hatched = vi.fn();
    const discovered = vi.fn();
    model.events.on('eggHatched', hatched);
    model.events.on('creatureDiscovered', discovered);

    expect(model.hatch(first.id)).toBe(true);
    expect(model.hatch(second.id)).toBe(true);
    expect(model.hatch(second.id)).toBe(false);
    expect(hatched).toHaveBeenCalledTimes(2);
    expect(discovered).toHaveBeenCalledTimes(1);
    expect(discovered).toHaveBeenCalledWith({ level: 1 });
  });

  it('merge entre pisos emite creaturesMerged, floorUnlocked y creatureDiscovered', () => {
    const state = emptyState();
    const a = addCreature(state, 6);
    const b = addCreature(state, 6, 0.2, 0.2);
    const model = modelWith(state);
    const order: string[] = [];
    model.events.on('creaturesMerged', (event) => order.push(`merged:${event.createdFloor}:${event.created.level}`));
    model.events.on('floorUnlocked', ({ floor }) => order.push(`unlocked:${floor}`));
    model.events.on('creatureDiscovered', ({ level }) => order.push(`discovered:${level}`));

    expect(model.merge(a.id, b.id).ok).toBe(true);
    expect(order).toEqual(['merged:1:7', 'unlocked:1', 'discovered:7']);
    expect(model.isFloorUnlocked(1)).toBe(true);
    expect(model.incomePerSecond).toBeCloseTo(195.3125);
  });

  it('si sube el piso de los huevos, el de abajo se cierra: se vacía y avisa con floorClosed', () => {
    const state = emptyState();
    state.discovered = [1, 7, 12];
    const left = addCreature(state, 3);
    const egg = addEgg(state, 0, 0.5, 0.5);
    const a = addCreature(state, 12);
    const b = addCreature(state, 12, 0.2, 0.2);
    const model = modelWith(state);
    const order: string[] = [];
    model.events.on('floorUnlocked', ({ floor }) => order.push(`unlocked:${floor}`));
    model.events.on('creatureDiscovered', ({ level }) => order.push(`discovered:${level}`));
    model.events.on('floorClosed', ({ floor, entities }) => order.push(`closed:${floor}:${entities.map((e) => e.id).join(',')}`));

    expect(model.merge(a.id, b.id).ok).toBe(true);
    expect(order).toEqual(['unlocked:2', 'discovered:13', `closed:0:${left.id},${egg.id}`]);
    expect(model.eggFloor).toBe(1);
    expect(model.floorCount(0)).toBe(0);
    expect(model.isFloorClosed(0)).toBe(true);
    expect(model.isFloorOpen(0)).toBe(false);
  });

  it('un guardado con criaturas en pisos ya cerrados se carga con esos pisos vacíos', () => {
    const state = emptyState();
    state.discovered = [7, 13, 19];
    addCreature(state, 2);
    addCreature(state, 8);
    addCreature(state, 14);
    const model = modelWith(state);
    expect([0, 1, 2].map((floor) => model.floorCount(floor))).toEqual([0, 0, 1]);
  });

  it('la tienda no vende criaturas de pisos cerrados', () => {
    const state = emptyState();
    state.discovered = [1, 2, 3, 7, 13, 19, 25];
    state.coins = 1e9;
    const model = modelWith(state);
    expect(model.checkPurchase(1)).toEqual({ ok: false, reason: 'floor-closed' });
  });

  it('un merge rechazado no emite nada', () => {
    const state = emptyState();
    const a = addCreature(state, 1);
    const b = addCreature(state, 2, 0.2, 0.2);
    const model = modelWith(state);
    const merged = vi.fn();
    model.events.on('creaturesMerged', merged);
    expect(model.merge(a.id, b.id)).toEqual({ ok: false, reason: 'different-level' });
    expect(merged).not.toHaveBeenCalled();
  });

  it('move guarda la posición acotada a 0..1', () => {
    const state = emptyState();
    const creature = addCreature(state, 1);
    const model = modelWith(state);
    model.move(creature.id, 1.4, -0.2);
    expect(model.state.floors[0].entities[0]).toMatchObject({ x: 1, y: 0 });
  });

  it('reset vuelve al estado inicial y avisa con stateReset', () => {
    const state = emptyState();
    addCreature(state, 3);
    state.coins = 500;
    const model = modelWith(state);
    const reset = vi.fn();
    model.events.on('stateReset', reset);
    model.reset();
    expect(model.state).toEqual(createInitialState());
    expect(reset).toHaveBeenCalledOnce();
  });

  it('buy cobra, encarece y avisa con creatureAdded en el piso de la criatura', () => {
    const state = emptyState();
    state.discovered = Array.from({ length: 10 }, (_, i) => i + 1);
    state.coins = 1e6;
    const model = modelWith(state);
    const added = vi.fn();
    model.events.on('creatureAdded', added);

    const price = BALANCE.SHOP_BASE_PRICE * BALANCE.SHOP_PRICE_GROWTH ** 7;
    expect(model.maxBuyableLevel).toBe(8);
    expect(model.buy(8).ok).toBe(true);
    expect(added).toHaveBeenCalledWith({ floor: 1, creature: expect.objectContaining({ level: 8 }) });
    expect(model.coins).toBeCloseTo(1e6 - price);
    expect(model.priceOf(8)).toBeCloseTo(price * BALANCE.SHOP_PURCHASE_GROWTH);
  });

  it('una compra rechazada no emite nada', () => {
    const model = modelWith();
    const added = vi.fn();
    model.events.on('creatureAdded', added);
    expect(model.buy(1)).toEqual({ ok: false, reason: 'locked' });
    expect(added).not.toHaveBeenCalled();
  });

  it('applyOfflineEarnings suma las monedas y devuelve el resumen', () => {
    const state = emptyState();
    addCreature(state, 3); // 5/s
    const model = modelWith(state);
    const report = model.applyOfflineEarnings(2 * 3_600_000);
    expect(report?.amount).toBeCloseTo(0.5 * 5 * 7200);
    expect(model.coins).toBeCloseTo(0.5 * 5 * 7200);
    expect(model.applyOfflineEarnings(10_000)).toBeNull();
    expect(model.coins).toBeCloseTo(0.5 * 5 * 7200);
  });

  it('debugAddCreature agrega en el piso de su nivel y respeta la capacidad', () => {
    const model = modelWith();
    const added = vi.fn();
    model.events.on('creatureAdded', added);
    expect(model.debugAddCreature(8)).toMatchObject({ level: 8 });
    expect(added).toHaveBeenCalledWith({ floor: 1, creature: expect.objectContaining({ level: 8 }) });
    expect(model.isDiscovered(8)).toBe(true);
    for (let i = 0; i < BALANCE.FLOOR_CAPACITY; i++) model.debugAddCreature(1);
    expect(model.floorCount(0)).toBe(BALANCE.FLOOR_CAPACITY);
    expect(model.debugAddCreature(1)).toBeNull();
    expect(model.debugAddCreature(121)).toBeNull();
  });
});
