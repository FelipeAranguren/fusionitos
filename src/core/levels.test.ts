import { describe, expect, it } from 'vitest';
import {
  FLOOR_COUNT,
  MAX_LEVEL,
  creatureConfig,
  floorOfLevel,
  hatchLevel,
  levelOf,
  mergeResultLevel,
  tierOfLevel,
} from './levels.ts';

describe('niveles y pisos', () => {
  it('hay 5 pisos y 30 niveles', () => {
    expect(FLOOR_COUNT).toBe(5);
    expect(MAX_LEVEL).toBe(30);
  });

  it('convierte nivel global ↔ piso y tier', () => {
    expect([floorOfLevel(1), tierOfLevel(1)]).toEqual([0, 1]);
    expect([floorOfLevel(6), tierOfLevel(6)]).toEqual([0, 6]);
    expect([floorOfLevel(7), tierOfLevel(7)]).toEqual([1, 1]);
    expect([floorOfLevel(30), tierOfLevel(30)]).toEqual([4, 6]);
    for (let n = 1; n <= MAX_LEVEL; n++) expect(levelOf(floorOfLevel(n), tierOfLevel(n))).toBe(n);
  });

  it('fusionar da n+1; dos tier 6 dan el tier 1 del piso siguiente', () => {
    expect(mergeResultLevel(1)).toBe(2);
    expect(mergeResultLevel(6)).toBe(7);
    expect([floorOfLevel(7), tierOfLevel(7)]).toEqual([1, 1]);
    expect(mergeResultLevel(29)).toBe(30);
  });

  it('el nivel 30 es el máximo y no se fusiona', () => {
    expect(mergeResultLevel(30)).toBeNull();
  });

  it('un huevo da el tier 1 de su piso', () => {
    expect(hatchLevel(0)).toBe(1);
    expect(hatchLevel(1)).toBe(7);
    expect(hatchLevel(4)).toBe(25);
  });

  it('creatureConfig devuelve la criatura del catálogo y rechaza niveles inválidos', () => {
    expect(creatureConfig(1).name).toBe('Oruga');
    expect(creatureConfig(7).name).toBe('Pollito');
    expect(creatureConfig(30).name).toBe('Sol viviente');
    expect(() => creatureConfig(0)).toThrow();
    expect(() => creatureConfig(31)).toThrow();
    expect(() => creatureConfig(1.5)).toThrow();
  });
});
