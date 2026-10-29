import { describe, expect, it } from 'vitest';
import { formatDuration, formatNumber } from './format.ts';

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [7.5, '7.5'],
    [18.75, '18.7'],
    [99.99, '99.9'],
    [244.14, '244'],
    [999, '999'],
    [999.99, '999'],
    [1000, '1K'],
    [1234, '1.2K'],
    [12_345, '12.3K'],
    [123_456, '123K'],
    [999_999, '999K'],
    [1_000_000, '1M'],
    [3_456_789, '3.4M'],
    [5.6e9, '5.6B'],
    [1e12, '1T'],
    [1.5e15, '1.5Qa'],
    [2.5 ** 29, '346B'],
    [2.9e28, '29oc'],
    [1e30, '1No'],
    [1e36, '1Ud'],
    [2.9e58, '29ocd'],
    [4.2e49, '42Qid'],
    [1e63, '1Vg'],
    [1e66, '1.00e66'],
  ])('%d → %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it('ningún sufijo empieza con O mayúscula: en la fuente del juego parece un cero ("29Oc" se leía "290c")', () => {
    for (let exponent = 3; exponent <= 63; exponent += 3) {
      expect(formatNumber(29 * 10 ** exponent)).not.toMatch(/\dO/);
    }
  });

  it('trunca en vez de redondear (nunca muestra más de lo que hay)', () => {
    expect(formatNumber(1999)).toBe('1.9K');
    expect(formatNumber(999_999_999)).toBe('999M');
  });

  it('maneja negativos e infinitos', () => {
    expect(formatNumber(-1234)).toBe('-1.2K');
    expect(formatNumber(Infinity)).toBe('∞');
  });
});

describe('formatDuration', () => {
  const MIN = 60_000;
  it.each([
    [30_000, 'menos de 1 min'],
    [MIN, '1 min'],
    [45 * MIN + 59_000, '45 min'],
    [60 * MIN, '1 h'],
    [135 * MIN, '2 h 15 min'],
    [24 * 60 * MIN, '1 d'],
    [(24 * 3 + 4) * 60 * MIN + 30 * MIN, '3 d 4 h'],
    [-MIN, 'menos de 1 min'],
  ])('%d ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});
