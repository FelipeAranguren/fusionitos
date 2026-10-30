import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import {
  CORRUPT_SAVE_KEY,
  DEVICE_BACKUP_KEY,
  SAVE_KEY,
  SAVE_VERSION,
  SaveManager,
  accountSaveKey,
  parseSave,
  serializeSave,
  type StorageLike,
} from './save.ts';
import { MAX_LEVEL } from './levels.ts';
import { addCreature, addEgg, emptyState } from './test-helpers.ts';

class MemoryStorage implements StorageLike {
  readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}

const brokenStorage: StorageLike = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

function sampleState() {
  const state = emptyState();
  state.coins = 1234.5;
  state.eggTimerMs = 2500;
  const creature = addCreature(state, 2, 0.25, 0.75);
  creature.payoutMs = 1200;
  addEgg(state, 0, 0.6, 0.4);
  addCreature(state, 7, 0.5, 0.5);
  state.discovered = [1, 2, 7];
  return state;
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseSave', () => {
  it('ida y vuelta conserva el estado y la fecha', () => {
    const state = sampleState();
    expect(parseSave(serializeSave(state, 42))).toEqual({ status: 'ok', state, savedAt: 42 });
  });

  it('sin guardado devuelve "empty"', () => {
    expect(parseSave(null)).toEqual({ status: 'empty' });
    expect(parseSave('')).toEqual({ status: 'empty' });
  });

  it.each([
    ['JSON corrupto', '{no es json'],
    ['un valor que no es objeto', '42'],
    ['sin versión', JSON.stringify({ state: {} })],
    ['una versión futura', JSON.stringify({ version: SAVE_VERSION + 1, savedAt: 0, state: {} })],
    ['un estado que no es objeto', JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: [] })],
  ])('rechaza %s', (_name, raw) => {
    expect(parseSave(raw).status).toBe('invalid');
  });

  it('corrige valores fuera de rango y descarta entidades inválidas', () => {
    const raw = JSON.stringify({
      version: SAVE_VERSION,
      savedAt: 1,
      state: {
        coins: -5,
        eggTimerMs: 99_999,
        nextId: 2,
        discovered: [1, 199, 'x'],
        floors: [
          {
            entities: [
              { kind: 'creature', id: 5, level: 2, x: 2, y: -1, payoutMs: 100 }, // se acota a 0..1
              { kind: 'creature', id: 5, level: 1, x: 0.5, y: 0.5, payoutMs: 0 }, // id repetido
              { kind: 'creature', id: 6, level: 7, x: 0.5, y: 0.5, payoutMs: 0 }, // nivel de otro piso
              { kind: 'creature', id: 9, level: 121, x: 0.5, y: 0.5, payoutMs: 0 }, // nivel inexistente
              { kind: 'dragon', id: 7, x: 0, y: 0 }, // tipo desconocido
              { kind: 'egg', id: 8, x: 0.1, y: Number.NaN }, // posición inválida (NaN → null en JSON)
              { kind: 'egg', id: 10, x: 0.1, y: 0.2 },
            ],
          },
        ],
      },
    });
    const parsed = parseSave(raw);
    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') return;
    const { state } = parsed;
    expect(state.coins).toBe(0);
    expect(state.eggTimerMs).toBe(BALANCE.EGG_INTERVAL_MS);
    expect(state.floors).toHaveLength(20);
    expect(state.floors[0].entities).toEqual([
      { kind: 'creature', id: 5, level: 2, x: 1, y: 0, payoutMs: 100 },
      { kind: 'egg', id: 10, x: 0.1, y: 0.2 },
    ]);
    expect(state.discovered).toEqual([1, 2]); // 199 y 'x' fuera; 2 sumado por coherencia
    expect(state.nextId).toBe(11);
  });

  it('migra un guardado v1 (anterior a la tienda) sin perder nada', () => {
    const creature = { kind: 'creature', id: 2, level: 2, x: 0.5, y: 0.25, payoutMs: 900 };
    const v1 = {
      version: 1,
      savedAt: 5,
      state: { coins: 99, eggTimerMs: 100, nextId: 3, discovered: [1, 2], floors: [{ entities: [creature] }] },
    };
    const parsed = parseSave(JSON.stringify(v1));
    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') return;
    expect(parsed.savedAt).toBe(5);
    expect(parsed.state).toMatchObject({ coins: 99, eggTimerMs: 100, nextId: 3, discovered: [1, 2] });
    expect(parsed.state.floors[0].entities).toEqual([creature]);
    expect(parsed.state.purchases).toEqual(Array(MAX_LEVEL).fill(0));
  });

  it('un guardado de cuando había 5 pisos carga en el juego de 20', () => {
    const creature = { kind: 'creature', id: 1, level: 27, x: 0.5, y: 0.5, payoutMs: 0 };
    const old = { version: SAVE_VERSION, savedAt: 0, state: { floors: [{ entities: [] }, {}, {}, {}, { entities: [creature] }], purchases: Array(30).fill(2) } };
    const parsed = parseSave(JSON.stringify(old));
    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') return;
    expect(parsed.state.floors).toHaveLength(20);
    expect(parsed.state.floors[4].entities).toEqual([creature]);
    expect(parsed.state.purchases).toHaveLength(MAX_LEVEL);
    expect(parsed.state.purchases.slice(28, 32)).toEqual([2, 2, 0, 0]);
  });

  it('sanea las compras: enteros positivos, una por nivel', () => {
    const purchases = [3, -1, 1.5, 'x', null, 2, ...Array(40).fill(1)];
    const parsed = parseSave(JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: { purchases } }));
    const expected = [3, 0, 0, 0, 0, 2, ...Array(40).fill(1), ...Array(MAX_LEVEL - 46).fill(0)];
    expect(parsed.status === 'ok' && parsed.state.purchases).toEqual(expected);
  });

  it('nunca carga más entidades que la capacidad del piso', () => {
    const entities = Array.from({ length: 20 }, (_, i) => ({ kind: 'egg', id: i + 1, x: 0.5, y: 0.5 }));
    const raw = JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: { floors: [{ entities }] } });
    const parsed = parseSave(raw);
    expect(parsed.status === 'ok' && parsed.state.floors[0].entities).toHaveLength(BALANCE.FLOOR_CAPACITY);
  });
});

describe('SaveManager', () => {
  it('guarda y vuelve a cargar', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage, { now: () => 1000 });
    const state = sampleState();
    expect(manager.save(state)).toBe(true);
    expect(JSON.parse(storage.getItem(SAVE_KEY) ?? '')).toMatchObject({ version: SAVE_VERSION, savedAt: 1000 });
    expect(new SaveManager(storage).load()).toEqual({ state, savedAt: 1000 });
  });

  it('se puede fechar el guardado en otro momento (pestaña oculta)', () => {
    const storage = new MemoryStorage();
    new SaveManager(storage, { now: () => 9999 }).save(sampleState(), 1234);
    expect(new SaveManager(storage).load()?.savedAt).toBe(1234);
  });

  it('cada cuenta guarda en su propia clave, aparte de la partida sin dueño', () => {
    const storage = new MemoryStorage();
    const account = new SaveManager(storage, { key: accountSaveKey('abc'), now: () => 50 });
    account.save(sampleState());
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(storage.getItem('fusionitos.save.account.abc')).not.toBeNull();
    expect(new SaveManager(storage, { key: accountSaveKey('otra') }).load()).toBeNull();

    storage.setItem(accountSaveKey('rota'), '{roto');
    expect(new SaveManager(storage, { key: accountSaveKey('rota') }).load()).toBeNull();
    expect(storage.getItem(`${accountSaveKey('rota')}.corrupt`)).toBe('{roto');
  });

  it('archive mueve el guardado a otra clave', () => {
    const storage = new MemoryStorage();
    const device = new SaveManager(storage, { now: () => 70 });
    device.save(sampleState());
    const raw = storage.getItem(SAVE_KEY);
    device.archive(DEVICE_BACKUP_KEY);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(storage.getItem(DEVICE_BACKUP_KEY)).toBe(raw);
    expect(device.load()).toBeNull();
    expect(() => device.archive(DEVICE_BACKUP_KEY)).not.toThrow();
    expect(storage.getItem(DEVICE_BACKUP_KEY)).toBe(raw);
  });

  it('sin guardado devuelve null', () => {
    expect(new SaveManager(new MemoryStorage()).load()).toBeNull();
  });

  it('respalda un guardado corrupto y arranca de cero', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{roto');
    expect(new SaveManager(storage).load()).toBeNull();
    expect(storage.getItem(CORRUPT_SAVE_KEY)).toBe('{roto');
  });

  it('clear borra el guardado', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage);
    manager.save(sampleState());
    manager.clear();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('si el storage falla o no existe, no lanza y avisa con false', () => {
    const broken = new SaveManager(brokenStorage);
    expect(broken.load()).toBeNull();
    expect(broken.save(sampleState())).toBe(false);
    expect(() => broken.clear()).not.toThrow();

    const missing = new SaveManager(null);
    expect(missing.load()).toBeNull();
    expect(missing.save(sampleState())).toBe(false);
  });
});
