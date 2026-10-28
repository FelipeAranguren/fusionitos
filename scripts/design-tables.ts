/**
 * Imprime la tabla de niveles de GAME_DESIGN.md §7.5, calculada con el código real.
 * Uso: npm run design:tables (Node ≥ 22.18 ejecuta TypeScript sin compilar).
 */
import { incomePerSecond, payoutAmount } from '../src/core/economy.ts';
import { formatNumber } from '../src/core/format.ts';
import { MAX_LEVEL, creatureConfig, floorConfig, floorOfLevel, tierOfLevel } from '../src/core/levels.ts';
import { creaturePrice } from '../src/core/shop.ts';

/** Precio de la primera compra (sin compras previas). */
const basePrice = (level: number): number => creaturePrice(level, 0);

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

const rows = [
  '| n | Piso · tier | Criatura | Ingreso/s | Pulso (cada 3 s) | Precio base F3 | Repago F3 |',
  '|---:|---|---|---:|---:|---:|---:|',
];
for (let level = 1; level <= MAX_LEVEL; level++) {
  const floor = floorOfLevel(level);
  const creature = creatureConfig(level);
  const income = incomePerSecond(level);
  const price = basePrice(level);
  rows.push(
    `| ${level} | ${floor + 1} ${floorConfig(floor).name} · ${tierOfLevel(level)} | ${creature.emoji} ${creature.name} | ` +
      `${formatNumber(income)} | +${formatNumber(payoutAmount(level))} | ${formatNumber(price)} | ${formatDuration(price / income)} |`,
  );
}
console.log(rows.join('\n'));
