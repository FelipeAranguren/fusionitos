/**
 * Simula una partida completa con un jugador automático y mide cuándo se desbloquea cada piso.
 * El jugador hace 2 acciones por segundo (abrir un huevo, fusionar los dos iguales de nivel más bajo
 * o comprar en la tienda), como alguien que juega seguido. Sirve para ajustar BALANCE hacia la
 * duración objetivo (GAME_DESIGN.md §7.6).
 * Uso: npm run simulate [-- --seed N --aps N --window N]
 */
// Lo único de Node que se usa; así no hace falta instalar sus tipos.
declare const process: { argv: string[] };

import { FLOORS } from '../src/config/creatures.ts';
import { formatDuration } from '../src/core/format.ts';
import { GameModel } from '../src/core/GameModel.ts';
import { MAX_LEVEL } from '../src/core/levels.ts';
import { mulberry32 } from '../src/core/rng.ts';

/** Ritmo del jugador: `--aps 2` simula a alguien más rápido. */
const apsArg = process.argv.indexOf('--aps');
const ACTIONS_PER_SECOND = apsArg > 0 ? Number(process.argv[apsArg + 1]) : 2;
const MAX_SECONDS = 48 * 3600;
/**
 * La tienda: compra el nivel más alto a la venta que pueda pagar, mirando hasta este número de niveles
 * hacia abajo (`--window 1`: solo el más alto, ahorrando para él).
 */
const windowArg = process.argv.indexOf('--window');
const BUY_WINDOW = windowArg > 0 ? Number(process.argv[windowArg + 1]) : 3;

export interface SimulationResult {
  /** Segundos de juego hasta el desbloqueo de cada piso (NaN si no llegó). */
  unlockedAt: number[];
  /** Segundos hasta descubrir la última criatura, o null si no llegó en el tope. */
  completedAt: number | null;
  seconds: number;
}

export function simulate(seed = 1234): SimulationResult {
  const model = new GameModel(undefined, mulberry32(seed));
  const unlockedAt = FLOORS.map((_, i) => (i === 0 ? 0 : Number.NaN));
  let seconds = 0;
  let completedAt: number | null = null;
  model.events.on('floorUnlocked', ({ floor }) => {
    unlockedAt[floor] = seconds;
  });
  model.events.on('creatureDiscovered', ({ level }) => {
    if (level === MAX_LEVEL) completedAt = seconds;
  });

  const hatchOne = (): boolean => {
    for (const floor of model.state.floors) {
      const egg = floor.entities.find((entity) => entity.kind === 'egg');
      if (egg && model.hatch(egg.id)) return true;
    }
    return false;
  };

  const mergeOne = (): boolean => {
    for (const floor of model.state.floors) {
      const byLevel = new Map<number, number[]>();
      for (const entity of floor.entities) {
        if (entity.kind !== 'creature') continue;
        byLevel.set(entity.level, [...(byLevel.get(entity.level) ?? []), entity.id]);
      }
      const levels = [...byLevel.keys()].sort((a, b) => a - b);
      for (const level of levels) {
        const ids = byLevel.get(level) ?? [];
        if (ids.length >= 2 && model.merge(ids[0], ids[1]).ok) return true;
      }
    }
    return false;
  };

  const buyOne = (): boolean => {
    const top = model.maxBuyableLevel;
    for (let level = top; level >= Math.max(1, top - BUY_WINDOW + 1); level--) {
      if (model.checkPurchase(level).ok) return model.buy(level).ok;
    }
    return false;
  };

  let budget = 0;
  while (completedAt === null && seconds < MAX_SECONDS) {
    model.tick(1000);
    seconds += 1;
    budget = Math.min(budget + ACTIONS_PER_SECOND, ACTIONS_PER_SECOND * 2);
    while (budget >= 1 && (hatchOne() || mergeOne() || buyOne())) budget -= 1;
  }
  return { unlockedAt, completedAt, seconds };
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/simulate.ts');
if (isMain) {
  const seedArg = process.argv.indexOf('--seed');
  const result = simulate(seedArg > 0 ? Number(process.argv[seedArg + 1]) : 1234);
  const rows = ['| Piso | Se desbloquea | Lo que tarda ese piso |', '|---|---:|---:|'];
  FLOORS.forEach((floor, i) => {
    const at = result.unlockedAt[i];
    const next = result.unlockedAt[i + 1] ?? result.completedAt ?? Number.NaN;
    const span = Number.isNaN(at) || Number.isNaN(next) ? '—' : formatDuration((next - at) * 1000);
    rows.push(`| ${i + 1} ${floor.name} | ${Number.isNaN(at) ? 'no llegó' : formatDuration(at * 1000)} | ${span} |`);
  });
  console.log(rows.join('\n'));
  console.log(
    result.completedAt === null
      ? `\nNo terminó en ${formatDuration(result.seconds * 1000)} (tope de la simulación).`
      : `\nTerminado (criatura ${MAX_LEVEL} descubierta) en ${formatDuration(result.completedAt * 1000)}.`,
  );
  console.log(`(Jugador automático: ${ACTIONS_PER_SECOND} acciones/s; compra mirando ${BUY_WINDOW} niveles hacia abajo.)`);
}
