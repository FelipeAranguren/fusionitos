import type { StorageLike } from '../core/save.ts';

/** Preferencias de audio de quien juega. Van aparte de la partida: no se reinician ni se versionan. */
export interface AudioSettings {
  music: boolean;
  sfx: boolean;
}

export const AUDIO_SETTINGS_KEY = 'fusionitos.audio';

const DEFAULTS: AudioSettings = { music: true, sfx: true };

export function loadAudioSettings(storage: StorageLike | null): AudioSettings {
  try {
    const raw: unknown = JSON.parse(storage?.getItem(AUDIO_SETTINGS_KEY) ?? 'null');
    if (typeof raw !== 'object' || raw === null) return { ...DEFAULTS };
    const { music, sfx } = raw as Record<string, unknown>;
    return {
      music: typeof music === 'boolean' ? music : DEFAULTS.music,
      sfx: typeof sfx === 'boolean' ? sfx : DEFAULTS.sfx,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAudioSettings(storage: StorageLike | null, settings: AudioSettings): void {
  try {
    storage?.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Sin storage, la preferencia dura hasta que se cierre la pestaña.
  }
}
