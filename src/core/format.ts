const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'] as const;

// Margen para que errores de coma flotante (5.6e9 / 1e9 = 5.6000…01) no bajen un dígito al truncar.
const EPSILON = 1e-9;

/**
 * Abrevia un número: 999 → "999", 1234 → "1.2K", 3 456 789 → "3.4M".
 * Trunca (nunca muestra más de lo que hay). Por debajo de 100 en su escala muestra
 * un decimal; desde 100, ninguno. Más allá del último sufijo usa notación científica.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';
  if (value < 0) return `-${formatNumber(-value)}`;
  if (value >= 1000 ** SUFFIXES.length) return value.toExponential(2).replace('e+', 'e');

  let tier = 0;
  while (tier < SUFFIXES.length - 1 && value >= 1000 ** (tier + 1)) tier++;
  const scaled = value / 1000 ** tier;
  const shown = scaled < 100 ? Math.floor(scaled * 10 + EPSILON) / 10 : Math.floor(scaled + EPSILON);
  return `${shown}${SUFFIXES[tier]}`;
}
