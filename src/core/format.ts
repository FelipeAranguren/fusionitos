import { STRINGS } from '../config/strings.ts';

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

/** Duración legible, truncada a minutos: "45 min", "2 h 15 min", "3 d 4 h". */
export function formatDuration(ms: number): string {
  const { underAMinute, day, hour, minute } = STRINGS.duration;
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
  if (totalMinutes < 1) return underAMinute;
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days} ${day} ${hours} ${hour}` : `${days} ${day}`;
  if (hours > 0) return minutes > 0 ? `${hours} ${hour} ${minutes} ${minute}` : `${hours} ${hour}`;
  return `${minutes} ${minute}`;
}
