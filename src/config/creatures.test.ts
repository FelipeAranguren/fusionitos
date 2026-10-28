import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance.ts';
import { EGG, FLOORS } from './creatures.ts';

describe('catálogo de criaturas', () => {
  it('tiene 5 pisos con 6 criaturas cada uno', () => {
    expect(FLOORS).toHaveLength(5);
    for (const floor of FLOORS) expect(floor.creatures).toHaveLength(BALANCE.CREATURES_PER_FLOOR);
  });

  it('no repite emojis ni nombres', () => {
    const creatures = FLOORS.flatMap((floor) => floor.creatures);
    expect(new Set(creatures.map((creature) => creature.emoji)).size).toBe(creatures.length);
    expect(new Set(creatures.map((creature) => creature.name)).size).toBe(creatures.length);
    expect(creatures.map((creature) => creature.emoji)).not.toContain(EGG.emoji);
  });

  it('cada piso tiene nombre, colores distintos y decoración', () => {
    expect(new Set(FLOORS.map((floor) => floor.fieldColor)).size).toBe(FLOORS.length);
    for (const floor of FLOORS) {
      expect(floor.name).not.toBe('');
      expect(floor.pageColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(floor.decor.length).toBeGreaterThan(0);
    }
  });
});
