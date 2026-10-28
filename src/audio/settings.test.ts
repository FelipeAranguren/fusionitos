import { describe, expect, it } from 'vitest';
import type { StorageLike } from '../core/save.ts';
import { AUDIO_SETTINGS_KEY, loadAudioSettings, saveAudioSettings } from './settings.ts';

function memoryStorage(initial?: string): StorageLike & { items: Map<string, string> } {
  const items = new Map<string, string>(initial === undefined ? [] : [[AUDIO_SETTINGS_KEY, initial]]);
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

describe('preferencias de audio', () => {
  it('por defecto, música y efectos prendidos', () => {
    expect(loadAudioSettings(memoryStorage())).toEqual({ music: true, sfx: true });
    expect(loadAudioSettings(null)).toEqual({ music: true, sfx: true });
  });

  it('guarda y vuelve a leer', () => {
    const storage = memoryStorage();
    saveAudioSettings(storage, { music: false, sfx: true });
    expect(loadAudioSettings(storage)).toEqual({ music: false, sfx: true });
  });

  it('tolera datos rotos o incompletos', () => {
    expect(loadAudioSettings(memoryStorage('{no es json'))).toEqual({ music: true, sfx: true });
    expect(loadAudioSettings(memoryStorage('{"sfx": false, "music": "no"}'))).toEqual({ music: true, sfx: false });
    expect(loadAudioSettings(memoryStorage('[1, 2]'))).toEqual({ music: true, sfx: true });
  });

  it('si el storage falla, no lanza', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    };
    expect(loadAudioSettings(broken)).toEqual({ music: true, sfx: true });
    expect(() => saveAudioSettings(broken, { music: false, sfx: false })).not.toThrow();
  });
});
