import { LAYOUT } from '../config/visuals.ts';
import { clamp01 } from '../core/field.ts';
import type { Point } from '../core/types.ts';

/** Único lugar que convierte entre posiciones normalizadas del modelo (0..1) y píxeles. */

const { field, fieldInset } = LAYOUT;

/** Rectángulo en píxeles donde pueden estar los centros de las entidades. */
export const FIELD_AREA = {
  left: field.x + fieldInset.left,
  top: field.y + fieldInset.top,
  right: field.x + field.width - fieldInset.right,
  bottom: field.y + field.height - fieldInset.bottom,
} as const;

const AREA_WIDTH = FIELD_AREA.right - FIELD_AREA.left;
const AREA_HEIGHT = FIELD_AREA.bottom - FIELD_AREA.top;

export function toWorld(point: Readonly<Point>): Point {
  return { x: FIELD_AREA.left + point.x * AREA_WIDTH, y: FIELD_AREA.top + point.y * AREA_HEIGHT };
}

export function toField(x: number, y: number): Point {
  return { x: clamp01((x - FIELD_AREA.left) / AREA_WIDTH), y: clamp01((y - FIELD_AREA.top) / AREA_HEIGHT) };
}

export function clampToField(x: number, y: number): Point {
  return toWorld(toField(x, y));
}
