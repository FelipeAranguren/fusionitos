/** Tipos del estado del juego. Todo es JSON serializable (se guarda tal cual). */

export type EntityId = number;

/** Posición normalizada (0..1) dentro del área útil del campo. */
export interface Point {
  x: number;
  y: number;
}

export interface Creature extends Point {
  readonly kind: 'creature';
  readonly id: EntityId;
  /** Nivel global 1..MAX_LEVEL. */
  readonly level: number;
  /** ms acumulados hacia el próximo pulso de monedas. */
  payoutMs: number;
}

export interface Egg extends Point {
  readonly kind: 'egg';
  readonly id: EntityId;
}

export type Entity = Creature | Egg;

export interface FloorState {
  entities: Entity[];
}

export interface GameState {
  coins: number;
  /** Uno por piso del catálogo, en orden. */
  floors: FloorState[];
  /** Niveles globales descubiertos, ordenados y sin repetir. */
  discovered: number[];
  /** Progreso hacia el próximo huevo. */
  eggTimerMs: number;
  nextId: EntityId;
}

/** Vista de solo lectura (profunda) del estado, para quien no debe mutarlo. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
