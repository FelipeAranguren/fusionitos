import { describe, expect, it } from 'vitest';
import { adjacentUnlockedFloor, isFloorFull, isFloorUnlocked } from './field.ts';
import { addCreature, emptyState, fillWithCreatures } from './test-helpers.ts';

describe('pisos desbloqueados', () => {
  it('el piso 1 siempre está abierto; los demás, al descubrir su tier 1', () => {
    const state = emptyState();
    expect(isFloorUnlocked(state, 0)).toBe(true);
    expect(isFloorUnlocked(state, 1)).toBe(false);
    state.discovered = [7];
    expect(isFloorUnlocked(state, 1)).toBe(true);
    expect(isFloorUnlocked(state, 2)).toBe(false);
  });

  it('adjacentUnlockedFloor salta los pisos bloqueados y se detiene en los bordes', () => {
    const state = emptyState();
    expect(adjacentUnlockedFloor(state, 0, 1)).toBeNull();
    expect(adjacentUnlockedFloor(state, 0, -1)).toBeNull();

    state.discovered = [7, 13];
    expect(adjacentUnlockedFloor(state, 0, 1)).toBe(1);
    expect(adjacentUnlockedFloor(state, 1, 1)).toBe(2);
    expect(adjacentUnlockedFloor(state, 2, 1)).toBeNull();
    expect(adjacentUnlockedFloor(state, 2, -1)).toBe(1);

    // Con un hueco (solo posible con herramientas de debug), lo salta.
    state.discovered = [25];
    expect(adjacentUnlockedFloor(state, 0, 1)).toBe(4);
    expect(adjacentUnlockedFloor(state, 4, -1)).toBe(0);
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
