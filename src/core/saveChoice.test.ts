import { describe, expect, it } from 'vitest';
import type { LoadedSave } from './save.ts';
import { chooseStartingSave, compareProgress } from './saveChoice.ts';
import { emptyState } from './test-helpers.ts';

/** Una partida que llegó hasta la criatura `best`, con `coins` monedas, guardada en `savedAt`. */
function save(best: number, savedAt: number, coins = 0): LoadedSave {
  const state = emptyState();
  state.discovered = Array.from({ length: best }, (_, i) => i + 1);
  state.coins = coins;
  return { state, savedAt };
}

describe('partida con la que arranca una cuenta', () => {
  it('sin nada guardado, partida nueva', () => {
    expect(chooseStartingSave({ cloud: null, local: null, device: null })).toEqual({ origin: 'new', save: null });
  });

  it('de la cuenta vale la más nueva: la de la nube o la copia local', () => {
    const cloud = save(10, 2000);
    const local = save(8, 1000);
    expect(chooseStartingSave({ cloud, local, device: null })).toEqual({ origin: 'account', save: cloud });

    // Se jugó sin conexión en este dispositivo después de la última subida.
    const offline = save(11, 3000);
    expect(chooseStartingSave({ cloud, local: offline, device: null }).save).toBe(offline);
    expect(chooseStartingSave({ cloud: null, local, device: null }).save).toBe(local);
  });

  it('la partida sin dueño del dispositivo pasa a una cuenta que no tiene ninguna', () => {
    const device = save(7, 500);
    expect(chooseStartingSave({ cloud: null, local: null, device })).toEqual({ origin: 'device', save: device });
  });

  it('si la cuenta ya tiene una, queda la más avanzada', () => {
    const cloud = save(20, 9000);
    expect(chooseStartingSave({ cloud, local: null, device: save(12, 99_000) })).toEqual({ origin: 'account', save: cloud });

    const better = save(25, 100);
    expect(chooseStartingSave({ cloud, local: null, device: better })).toEqual({ origin: 'device', save: better });
  });

  it('a igual progreso queda la de la cuenta', () => {
    const cloud = save(20, 9000, 500);
    expect(chooseStartingSave({ cloud, local: null, device: save(20, 9500, 500) }).origin).toBe('account');
  });
});

describe('comparar progreso', () => {
  it('manda la mejor criatura descubierta y, a igualdad, las monedas', () => {
    expect(compareProgress(save(10, 0).state, save(9, 0, 1e9).state)).toBeGreaterThan(0);
    expect(compareProgress(save(10, 0, 5).state, save(10, 0, 50).state)).toBeLessThan(0);
    expect(compareProgress(save(10, 0, 5).state, save(10, 0, 5).state)).toBe(0);
    expect(compareProgress(save(0, 0).state, save(1, 0).state)).toBeLessThan(0);
  });
});
