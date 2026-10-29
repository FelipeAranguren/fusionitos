import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance.ts';
import { EGG, FLOORS } from './creatures.ts';

describe('catálogo de criaturas', () => {
  it('tiene 20 pisos con 6 criaturas cada uno', () => {
    expect(FLOORS).toHaveLength(20);
    for (const floor of FLOORS) expect(floor.creatures).toHaveLength(BALANCE.CREATURES_PER_FLOOR);
  });

  it('no repite emojis ni nombres de criaturas, ni de pisos', () => {
    const creatures = FLOORS.flatMap((floor) => floor.creatures);
    expect(new Set(creatures.map((creature) => creature.emoji)).size).toBe(creatures.length);
    expect(new Set(creatures.map((creature) => creature.name)).size).toBe(creatures.length);
    expect(new Set(FLOORS.map((floor) => floor.name)).size).toBe(FLOORS.length);
    expect(creatures.map((creature) => creature.emoji)).not.toContain(EGG.emoji);
  });

  it('ninguna decoración usa el emoji de una criatura (confundiría)', () => {
    const creatureEmojis = new Set(FLOORS.flatMap((floor) => floor.creatures.map((creature) => creature.emoji)));
    for (const floor of FLOORS) {
      for (const emoji of floor.decor) expect(creatureEmojis.has(emoji), `${floor.name}: ${emoji}`).toBe(false);
    }
  });

  it('cada piso tiene un nombre corto (entra en la pestaña), color propio y decoración', () => {
    expect(new Set(FLOORS.map((floor) => floor.fieldColor)).size).toBe(FLOORS.length);
    for (const floor of FLOORS) {
      expect(floor.name.length).toBeGreaterThan(0);
      expect(floor.name.length).toBeLessThanOrEqual(12);
      expect(floor.pageColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(floor.decor.length).toBeGreaterThan(0);
    }
  });
});
