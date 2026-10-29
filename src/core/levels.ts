import { BALANCE } from '../config/balance.ts';
import { FLOORS, type CreatureConfig, type FloorConfig } from '../config/creatures.ts';

/** Aritmética de niveles: nivel global n (1..MAX_LEVEL) ↔ piso (índice 0..) y tier (1..6). */

export const FLOOR_COUNT = FLOORS.length;
export const MAX_LEVEL = FLOOR_COUNT * BALANCE.CREATURES_PER_FLOOR;

export function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= MAX_LEVEL;
}

export function floorOfLevel(level: number): number {
  return Math.floor((level - 1) / BALANCE.CREATURES_PER_FLOOR);
}

export function tierOfLevel(level: number): number {
  return ((level - 1) % BALANCE.CREATURES_PER_FLOOR) + 1;
}

export function levelOf(floor: number, tier: number): number {
  return floor * BALANCE.CREATURES_PER_FLOOR + tier;
}

/**
 * Resultado de fusionar dos criaturas de `level`: siempre n+1.
 * Tier 6 + tier 6 da el tier 1 del piso siguiente sin caso especial. Null en el nivel máximo.
 */
export function mergeResultLevel(level: number): number | null {
  return level < MAX_LEVEL ? level + 1 : null;
}

/** Nivel de la criatura que sale de un huevo en ese piso (su tier 1). */
export function hatchLevel(floor: number): number {
  return levelOf(floor, 1);
}

/** Criatura que hay que fusionar (dos iguales) para abrir un piso: el tier 6 del anterior. Null en el piso 1. */
export function unlockRequirementLevel(floor: number): number | null {
  return floor > 0 ? levelOf(floor - 1, BALANCE.CREATURES_PER_FLOOR) : null;
}

export function creatureConfig(level: number): CreatureConfig {
  const creature = FLOORS[floorOfLevel(level)]?.creatures[tierOfLevel(level) - 1];
  if (!isValidLevel(level) || !creature) throw new Error(`Nivel de criatura inválido: ${level}`);
  return creature;
}

export function floorConfig(floor: number): FloorConfig {
  const config = FLOORS[floor];
  if (!config) throw new Error(`Piso inválido: ${floor}`);
  return config;
}
