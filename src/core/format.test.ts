import { describe, expect, it } from 'vitest';
import { formatNumber } from './format.ts';

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
    [1e36, '1.00e36'],
  ])('%d → %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
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
