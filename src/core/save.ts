import { BALANCE } from '../config/balance.ts';
import { MAX_LEVEL, floorOfLevel, isValidLevel } from './levels.ts';
import { createInitialState } from './state.ts';
import type { DeepReadonly, Entity, GameState } from './types.ts';

/** Partida de este dispositivo de antes de las cuentas (sin dueño): pasa a la primera cuenta que entra. */
export const SAVE_KEY = 'fusionitos.save';
export const CORRUPT_SAVE_KEY = `${SAVE_KEY}.corrupt`;
/** Copia de la partida sin dueño una vez que pasó a una cuenta. Por las dudas: el juego no la vuelve a leer. */
export const DEVICE_BACKUP_KEY = `${SAVE_KEY}.device-backup`;

/** Copia local de la partida de una cuenta (`uid` de Firebase): con ella se puede jugar sin conexión. */
export function accountSaveKey(uid: string): string {
  return `${SAVE_KEY}.account.${uid}`;
}
/**
 * Subila (y agregá una migración) cada vez que cambie la forma de GameState.
 * v1: F1/F2. v2: compras de la tienda (`purchases`).
 */
export const SAVE_VERSION = 2;

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
const MIGRATIONS: Readonly<Partial<Record<number, Migration>>> = {
  // v1 → v2: llega la tienda; nadie compró nada todavía.
  1: (file) => ({ ...file, version: 2, state: isObject(file.state) ? { ...file.state, purchases: [] } : file.state }),
};

export interface LoadedSave {
  state: GameState;
  savedAt: number;
}

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

export interface SaveManagerOptions {
  /** Clave en el storage; por defecto, la partida sin dueño de antes de las cuentas. */
  key?: string;
  now?: () => number;
}

/** Lee y escribe un guardado. Nunca lanza: si el storage falla, el juego sigue sin guardar. */
export class SaveManager {
  private readonly storage: StorageLike | null;
  private readonly key: string;
  private readonly now: () => number;

  constructor(storage: StorageLike | null, { key = SAVE_KEY, now = Date.now }: SaveManagerOptions = {}) {
    this.storage = storage;
    this.key = key;
    this.now = now;
  }

  /** Guardado y su fecha, o null si no hay. Un guardado corrupto se respalda aparte (`<clave>.corrupt`) y se ignora. */
  load(): LoadedSave | null {
    const raw = this.read(this.key);
    const parsed = parseSave(raw);
    if (parsed.status === 'ok') return { state: parsed.state, savedAt: parsed.savedAt };
    if (parsed.status === 'invalid' && raw !== null) {
      const backupKey = `${this.key}.corrupt`;
      console.warn(`[guardado] ${parsed.reason}: se respalda en "${backupKey}" y se ignora.`);
      this.write(backupKey, raw);
    }
    return null;
  }

  /**
   * Devuelve false si no hay storage o si falló (modo privado, cuota llena…).
   * `savedAt` permite fechar el guardado en el último momento en que el juego corrió (pestaña oculta).
   */
  save(state: DeepReadonly<GameState>, savedAt: number = this.now()): boolean {
    return this.write(this.key, serializeSave(state, savedAt));
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      // Sin storage no hay nada que borrar.
    }
  }

  /** Mueve el guardado a `backupKey` (pisando lo que hubiera) y lo saca de su clave. */
  archive(backupKey: string): void {
    const raw = this.read(this.key);
    if (raw !== null && this.write(backupKey, raw)) this.clear();
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

  const rawPurchases: unknown[] = Array.isArray(raw.purchases) ? raw.purchases : [];
  state.purchases = Array.from({ length: MAX_LEVEL }, (_, i) => {
    const count = rawPurchases[i];
    return typeof count === 'number' && Number.isInteger(count) && count > 0 ? count : 0;
  });
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
