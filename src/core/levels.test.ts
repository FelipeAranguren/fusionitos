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
  unlockRequirementLevel,
} from './levels.ts';

describe('niveles y pisos', () => {
  it('hay 20 pisos y 120 niveles', () => {
    expect(FLOOR_COUNT).toBe(20);
    expect(MAX_LEVEL).toBe(120);
  });

  it('convierte nivel global ↔ piso y tier', () => {
    expect([floorOfLevel(1), tierOfLevel(1)]).toEqual([0, 1]);
    expect([floorOfLevel(6), tierOfLevel(6)]).toEqual([0, 6]);
    expect([floorOfLevel(7), tierOfLevel(7)]).toEqual([1, 1]);
    expect([floorOfLevel(30), tierOfLevel(30)]).toEqual([4, 6]);
    expect([floorOfLevel(120), tierOfLevel(120)]).toEqual([19, 6]);
    for (let n = 1; n <= MAX_LEVEL; n++) expect(levelOf(floorOfLevel(n), tierOfLevel(n))).toBe(n);
  });

  it('fusionar da n+1; dos tier 6 dan el tier 1 del piso siguiente', () => {
    expect(mergeResultLevel(1)).toBe(2);
    expect(mergeResultLevel(6)).toBe(7);
    expect([floorOfLevel(7), tierOfLevel(7)]).toEqual([1, 1]);
    expect(mergeResultLevel(30)).toBe(31);
    expect(mergeResultLevel(119)).toBe(120);
  });

  it('el nivel 120 es el máximo y no se fusiona', () => {
    expect(mergeResultLevel(120)).toBeNull();
  });

  it('un huevo da el tier 1 de su piso', () => {
    expect(hatchLevel(0)).toBe(1);
    expect(hatchLevel(1)).toBe(7);
    expect(hatchLevel(4)).toBe(25);
    expect(hatchLevel(19)).toBe(115);
  });

  it('cada piso se abre fusionando el tier 6 del anterior', () => {
    expect(unlockRequirementLevel(0)).toBeNull();
    expect(unlockRequirementLevel(1)).toBe(6);
    expect(unlockRequirementLevel(4)).toBe(24);
    expect(creatureConfig(6).name).toBe('Mariposa');
  });

  it('creatureConfig devuelve la criatura del catálogo y rechaza niveles inválidos', () => {
    expect(creatureConfig(1).name).toBe('Oruga');
    expect(creatureConfig(7).name).toBe('Pollito');
    expect(creatureConfig(30).name).toBe('Cocodrilo');
    expect(creatureConfig(120).name).toBe('Supernova');
    expect(() => creatureConfig(0)).toThrow();
    expect(() => creatureConfig(121)).toThrow();
    expect(() => creatureConfig(1.5)).toThrow();
  });
});
