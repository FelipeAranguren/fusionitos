import { describe, expect, it } from 'vitest';
import { canPush } from './ownership.ts';

describe('quién puede subir la partida', () => {
  it('la apertura que la tomó sube mientras siga siendo la última', () => {
    expect(canPush(true, 'esta', 'esta')).toBe(true);
  });

  it('si otra apertura la tomó después, esta deja de subir', () => {
    expect(canPush(true, 'otra', 'esta')).toBe(false);
  });

  it('sin dueño (cuenta nueva o partida vieja) se puede subir', () => {
    expect(canPush(true, undefined, 'esta')).toBe(true);
  });

  it('si al abrir no había conexión, la primera subida la toma aunque haya otra', () => {
    expect(canPush(false, 'otra', 'esta')).toBe(true);
  });
});
