import type Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '../../config/visuals.ts';

export interface TextOptions {
  size: number;
  color?: string;
  weight?: 500 | 600 | 700;
  /** Contorno oscuro para leerse sobre cualquier fondo (desactivar en textos con emojis). */
  stroke?: boolean;
  align?: 'left' | 'center' | 'right';
  wrapWidth?: number;
}

export function textStyle({
  size,
  color = COLORS.textLight,
  weight = 600,
  stroke = true,
  align = 'center',
  wrapWidth,
}: TextOptions): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: String(weight),
    color,
    align,
    stroke: COLORS.stroke,
    strokeThickness: stroke ? Math.max(4, Math.round(size / 7)) : 0,
    wordWrap: wrapWidth ? { width: wrapWidth, useAdvancedWrap: true } : undefined,
  };
}
