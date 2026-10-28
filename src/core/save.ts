import { BALANCE } from '../config/balance.ts';
import { floorOfLevel, isValidLevel } from './levels.ts';
import { createInitialState } from './state.ts';
import type { DeepReadonly, Entity, GameState } from './types.ts';

export const SAVE_KEY = 'fusionitos.save';
export const CORRUPT_SAVE_KEY = 'fusionitos.save.corrupt';
/** Subila (y agregá una migración) cada vez que cambie la forma de GameState. */
export const SAVE_VERSION = 1;

/** Lo mínimo que se usa de localStorage; inyectable para tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveFile {
  version: number;
  /** Momento del guardado (ms epoch); lo va a usar el ingreso offline de F3. */
  savedAt: number;
  state: DeepReadonly<GameState>;
}

export type ParsedSave =
  | { status: 'empty' }
  | { status: 'ok'; state: GameState; savedAt: number }
  | { status: 'invalid'; reason: string };

type RawObject = Record<string, unknown>;
type Migration = (file: RawObject) => RawObject;

/** MIGRATIONS[v] convierte un guardado de la versión v a la v+1. */
const MIGRATIONS: Readonly<Partial<Record<number, Migration>>> = {};

export function serializeSave(state: DeepReadonly<GameState>, savedAt: number): string {
  const file: SaveFile = { version: SAVE_VERSION, savedAt, state };
  return JSON.stringify(file);
}

/** Interpreta un guardado: valida, migra y sanea. Nunca lanza. */
export function parseSave(raw: string | null): ParsedSave {
  if (raw === null || raw === '') return { status: 'empty' };

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { status: 'invalid', reason: 'JSON corrupto' };
  }
  if (!isObject(data)) return { status: 'invalid', reason: 'formato desconocido' };

  const version = data.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > SAVE_VERSION) {
    return { status: 'invalid', reason: `versión no soportada: ${String(version)}` };
  }

  let file = data;
  for (let v = version; v < SAVE_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (!migration) return { status: 'invalid', reason: `falta la migración ${v}→${v + 1}` };
    file = migration(file);
  }

  const state = sanitizeState(file.state);
  if (!state) return { status: 'invalid', reason: 'estado inválido' };
  return { status: 'ok', state, savedAt: finiteOr(file.savedAt, 0) };
}

/** Lee y escribe el guardado. Nunca lanza: si el storage falla, el juego sigue sin guardar. */
export class SaveManager {
  private readonly storage: StorageLike | null;
  private readonly now: () => number;

  constructor(storage: StorageLike | null, now: () => number = Date.now) {
    this.storage = storage;
    this.now = now;
  }

  /** Estado guardado, o null si no hay. Un guardado corrupto se respalda aparte y se ignora. */
  load(): GameState | null {
    const raw = this.read(SAVE_KEY);
    const parsed = parseSave(raw);
    if (parsed.status === 'ok') return parsed.state;
    if (parsed.status === 'invalid' && raw !== null) {
      console.warn(`[guardado] ${parsed.reason}: se respalda en "${CORRUPT_SAVE_KEY}" y se empieza de cero.`);
      this.write(CORRUPT_SAVE_KEY, raw);
    }
    return null;
  }

  /** Devuelve false si no hay storage o si falló (modo privado, cuota llena…). */
  save(state: DeepReadonly<GameState>): boolean {
    return this.write(SAVE_KEY, serializeSave(state, this.now()));
  }

  clear(): void {
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      // Sin storage no hay nada que borrar.
    }
  }

  private read(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

/** Arma un GameState válido a partir de datos no confiables: corrige rangos y descarta lo inválido. */
function sanitizeState(raw: unknown): GameState | null {
  if (!isObject(raw)) return null;
  const state = createInitialState();
  state.coins = Math.max(0, finiteOr(raw.coins, 0));
  state.eggTimerMs = clamp(finiteOr(raw.eggTimerMs, state.eggTimerMs), 0, BALANCE.EGG_INTERVAL_MS);

  const rawFloors: unknown[] = Array.isArray(raw.floors) ? raw.floors : [];
  const usedIds = new Set<number>();
  state.floors.forEach((floor, floorIndex) => {
    const rawFloor = rawFloors[floorIndex];
    const rawEntities: unknown[] = isObject(rawFloor) && Array.isArray(rawFloor.entities) ? rawFloor.entities : [];
    for (const rawEntity of rawEntities) {
      if (floor.entities.length >= BALANCE.FLOOR_CAPACITY) break;
      const entity = sanitizeEntity(rawEntity, floorIndex);
      if (!entity || usedIds.has(entity.id)) continue;
      usedIds.add(entity.id);
      floor.entities.push(entity);
    }
  });

  const discovered = new Set<number>();
  if (Array.isArray(raw.discovered)) {
    for (const level of raw.discovered) {
      if (typeof level === 'number' && isValidLevel(level)) discovered.add(level);
    }
  }
  // Coherencia: toda criatura presente cuenta como descubierta.
  for (const floor of state.floors) {
    for (const entity of floor.entities) if (entity.kind === 'creature') discovered.add(entity.level);
  }
  state.discovered = [...discovered].sort((a, b) => a - b);

  const savedNextId = finiteOr(raw.nextId, 1);
  state.nextId = Math.max(Number.isInteger(savedNextId) ? savedNextId : 1, Math.max(0, ...usedIds) + 1);
  return state;
}

function sanitizeEntity(raw: unknown, floor: number): Entity | null {
  if (!isObject(raw)) return null;
  const { id, x, y } = raw;
  if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) return null;
  if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) return null;
  const position = { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };

  if (raw.kind === 'egg') return { kind: 'egg', id, ...position };
  if (raw.kind === 'creature') {
    const level = raw.level;
    // Una criatura siempre vive en el piso de su nivel.
    if (typeof level !== 'number' || !isValidLevel(level) || floorOfLevel(level) !== floor) return null;
    const payoutMs = clamp(finiteOr(raw.payoutMs, 0), 0, BALANCE.COIN_POP_INTERVAL_MS);
    return { kind: 'creature', id, level, ...position, payoutMs };
  }
  return null;
}

function isObject(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
