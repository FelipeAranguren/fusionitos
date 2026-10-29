import { describe, expect, it } from 'vitest';
import { installPlatform, showInstallButton } from './platform.ts';

const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';
const WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

describe('plataforma para el acceso directo', () => {
  it('reconoce Android e iPhone', () => {
    expect(installPlatform(ANDROID_CHROME, 5)).toBe('android');
    expect(installPlatform(IPHONE_SAFARI, 5)).toBe('ios');
  });

  it('el iPad se presenta como Mac, pero es táctil', () => {
    expect(installPlatform(MAC_SAFARI, 5)).toBe('ios');
    expect(installPlatform(MAC_SAFARI, 0)).toBe('other');
  });

  it('en la compu no hay pasos que explicar', () => {
    expect(installPlatform(WINDOWS_CHROME, 0)).toBe('other');
  });
});

describe('botón de acceso directo', () => {
  const base = { standalone: false, canPrompt: false, installedBefore: false };

  it('abierto como app no se muestra', () => {
    expect(showInstallButton({ ...base, standalone: true, canPrompt: true, platform: 'android' })).toBe(false);
  });

  it('si el navegador ofrece instalar, se muestra en cualquier sistema', () => {
    expect(showInstallButton({ ...base, canPrompt: true, platform: 'other' })).toBe(true);
  });

  it('sin el diálogo del navegador, solo en celulares', () => {
    expect(showInstallButton({ ...base, platform: 'android' })).toBe(true);
    expect(showInstallButton({ ...base, platform: 'ios' })).toBe(true);
    expect(showInstallButton({ ...base, platform: 'other' })).toBe(false);
  });

  it('ya instalado, solo vuelve si el navegador ofrece instalar de nuevo', () => {
    expect(showInstallButton({ ...base, installedBefore: true, platform: 'android' })).toBe(false);
    expect(showInstallButton({ ...base, installedBefore: true, canPrompt: true, platform: 'android' })).toBe(true);
  });
});
