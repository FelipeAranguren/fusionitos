import { describe, expect, it } from 'vitest';
import {
  adjacentOpenFloor,
  emptyClosedFloors,
  highestUnlockedFloor,
  isFloorClosed,
  isFloorFull,
  isFloorOpen,
  isFloorUnlocked,
} from './field.ts';
import { addCreature, addEgg, emptyState, fillWithCreatures } from './test-helpers.ts';

describe('pisos desbloqueados', () => {
  it('el piso 1 siempre está abierto; los demás, al descubrir su tier 1', () => {
    const state = emptyState();
    expect(isFloorUnlocked(state, 0)).toBe(true);
    expect(isFloorUnlocked(state, 1)).toBe(false);
    state.discovered = [7];
    expect(isFloorUnlocked(state, 1)).toBe(true);
    expect(isFloorUnlocked(state, 2)).toBe(false);
  });

  it('highestUnlockedFloor: el más alto con su tier 1 descubierto', () => {
    const state = emptyState();
    expect(highestUnlockedFloor(state)).toBe(0);
    state.discovered = [1, 7, 13];
    expect(highestUnlockedFloor(state)).toBe(2);
    state.discovered = [115];
    expect(highestUnlockedFloor(state)).toBe(19);
  });

  it('adjacentOpenFloor salta los pisos bloqueados y se detiene en los bordes', () => {
    const state = emptyState();
    expect(adjacentOpenFloor(state, 0, 1)).toBeNull();
    expect(adjacentOpenFloor(state, 0, -1)).toBeNull();

    state.discovered = [7, 13];
    expect(adjacentOpenFloor(state, 0, 1)).toBe(1);
    expect(adjacentOpenFloor(state, 1, 1)).toBe(2);
    expect(adjacentOpenFloor(state, 2, 1)).toBeNull();
    expect(adjacentOpenFloor(state, 2, -1)).toBe(1);

    // Con un hueco (solo posible con herramientas de debug), lo salta.
    state.discovered = [13];
    expect(adjacentOpenFloor(state, 0, 1)).toBe(2);
    expect(adjacentOpenFloor(state, 2, -1)).toBe(0);
  });

  it('adjacentOpenFloor no lleva a los pisos cerrados', () => {
    const state = emptyState();
    state.discovered = [7, 13, 19]; // Piso 4 abierto: los huevos caen en el 2 y el 1 cierra.
    expect(adjacentOpenFloor(state, 1, -1)).toBeNull();
    expect(adjacentOpenFloor(state, 2, -1)).toBe(1);
  });
});

describe('pisos cerrados', () => {
  it('cierran los que quedan por debajo del piso de los huevos', () => {
    const state = emptyState();
    state.discovered = [7, 13];
    expect(isFloorClosed(state, 0)).toBe(false);
    state.discovered.push(19);
    expect(isFloorClosed(state, 0)).toBe(true);
    expect(isFloorClosed(state, 1)).toBe(false);
  });

  it('abierto es desbloqueado y no cerrado: quedan 3, el de los huevos, uno intermedio y el más alto', () => {
    const state = emptyState();
    state.discovered = [7, 13, 19];
    expect([0, 1, 2, 3, 4].map((floor) => isFloorOpen(state, floor))).toEqual([false, true, true, true, false]);
  });

  it('emptyClosedFloors vacía solo los cerrados y devuelve lo que tenían', () => {
    const state = emptyState();
    const creature = addCreature(state, 2);
    const egg = addEgg(state, 0, 0.3, 0.3);
    addCreature(state, 8);
    state.discovered = [7, 13, 19];
    expect(emptyClosedFloors(state)).toEqual([{ floor: 0, entities: [creature, egg] }]);
    expect(state.floors[0].entities).toEqual([]);
    expect(state.floors[1].entities).toHaveLength(1);
    expect(emptyClosedFloors(state)).toEqual([]);
  });
});

describe('capacidad por piso', () => {
  it('cada piso tiene su propio límite de 12', () => {
    const state = emptyState();
    fillWithCreatures(state, 7, 12);
    addCreature(state, 1);
    expect(isFloorFull(state, 1)).toBe(true);
    expect(isFloorFull(state, 0)).toBe(false);
  });
});
