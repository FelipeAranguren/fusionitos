/**
 * Constantes de balance: ÚNICA fuente (espejo en GAME_DESIGN.md §11).
 * Si cambiás algo acá, actualizá GAME_DESIGN.md en el mismo commit.
 */
export const BALANCE = {
  /** Criaturas por piso (tiers 1..6). */
  CREATURES_PER_FLOOR: 6,
  /** Máximo de entidades (criaturas + huevos) por piso. */
  FLOOR_CAPACITY: 12,

  /** Cada cuánto cae un huevo. */
  EGG_INTERVAL_MS: 5000,
  /** Espera hasta el primer huevo de una partida nueva. */
  FIRST_EGG_DELAY_MS: 1000,
  /** Piso (índice) donde caen los huevos. */
  EGG_FLOOR: 0,
  /** Posiciones sorteadas para ubicar un huevo; gana la más alejada del resto. */
  SPAWN_CANDIDATES: 12,

  /** ingreso(n) = INCOME_BASE × INCOME_GROWTH^(n−1) monedas/s. */
  INCOME_BASE: 1,
  INCOME_GROWTH: 2.5,
  /** Cada cuánto una criatura suelta lo que produjo (texto "+X"). */
  COIN_POP_INTERVAL_MS: 3000,

  /** Tope de tiempo simulado por frame: evita saltos después de un tirón. */
  MAX_TICK_MS: 1000,
  /** Autoguardado. */
  AUTOSAVE_INTERVAL_MS: 10_000,

  // FASE 3 (todavía sin uso)
  /** precio(n, k) = SHOP_BASE_PRICE × SHOP_PRICE_GROWTH^(n−1) × SHOP_PURCHASE_GROWTH^k */
  SHOP_BASE_PRICE: 15,
  SHOP_PRICE_GROWTH: 3,
  SHOP_PURCHASE_GROWTH: 1.15,
  /** Solo se compran criaturas con n ≤ máximo descubierto − esto. */
  SHOP_LEVELS_BELOW_MAX: 2,
  /** Ingreso offline = tasa × ingreso total × min(ausencia, tope). */
  OFFLINE_INCOME_RATE: 0.5,
  OFFLINE_MAX_HOURS: 4,
} as const;
