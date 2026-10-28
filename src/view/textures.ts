import type Phaser from 'phaser';
import { EGG, FLOORS } from '../config/creatures.ts';
import { EMOJI_FONT_FAMILY, ICONS, SIZES } from '../config/visuals.ts';
import { MAX_LEVEL, creatureConfig } from '../core/levels.ts';

/**
 * El juego dibuja todo por clave de textura. Cada clave sale de una imagen del catálogo
 * (si tiene `image`) o se genera acá a partir de su emoji.
 */
export const TEXTURES = {
  egg: 'egg',
  coin: 'coin',
  spark: 'spark',
  shell: 'shell',
  lock: 'lock',
} as const;

export const creatureTextureKey = (level: number): string => `creature-${level}`;
export const decorTextureKey = (emoji: string): string => `decor-${emoji}`;

/** Encola en el loader las imágenes definidas en el catálogo. */
export function preloadCatalogImages(scene: Phaser.Scene): void {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const { image } = creatureConfig(level);
    if (image) scene.load.image(creatureTextureKey(level), image);
  }
  if (EGG.image) scene.load.image(TEXTURES.egg, EGG.image);
}

/** Genera las texturas que no vinieron como imagen: emojis, moneda, chispa y cáscara. */
export function generateTextures(scene: Phaser.Scene): void {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    createEmojiTexture(scene, creatureTextureKey(level), creatureConfig(level).emoji, SIZES.emojiTexture, SIZES.emojiOutline);
  }
  createEmojiTexture(scene, TEXTURES.egg, EGG.emoji, SIZES.emojiTexture, SIZES.emojiOutline);
  createEmojiTexture(scene, TEXTURES.lock, ICONS.lock, 128, 4);
  for (const emoji of new Set(FLOORS.flatMap((floor) => floor.decor))) {
    createEmojiTexture(scene, decorTextureKey(emoji), emoji, 128, 0);
  }
  createCoinTexture(scene);
  createSparkTexture(scene);
  createShellTexture(scene);
}

/** Rasteriza un emoji centrado según la caja real del glifo, con borde blanco opcional tipo sticker. */
function createEmojiTexture(scene: Phaser.Scene, key: string, emoji: string, size: number, outline: number): void {
  if (scene.textures.exists(key)) return;
  const glyph = document.createElement('canvas');
  glyph.width = size;
  glyph.height = size;
  const g = glyph.getContext('2d');
  if (!g) return;

  // La caja medida depende de la alineación: se fija antes de medir.
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  const box = size - outline * 2 - 6;
  let fontSize = box * 0.85;
  const measure = () => {
    g.font = `${fontSize}px ${EMOJI_FONT_FAMILY}`;
    const metrics = g.measureText(emoji);
    return {
      metrics,
      width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
      height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
    };
  };
  let glyphBox = measure();
  const fit = box / Math.max(glyphBox.width, glyphBox.height, 1);
  if (fit < 1) {
    fontSize *= fit;
    glyphBox = measure();
  }
  g.fillText(
    emoji,
    (size - glyphBox.width) / 2 + glyphBox.metrics.actualBoundingBoxLeft,
    (size - glyphBox.height) / 2 + glyphBox.metrics.actualBoundingBoxAscent,
  );

  const texture = scene.textures.createCanvas(key, size, size);
  if (!texture) return;
  const ctx = texture.getContext();
  if (outline > 0) {
    const silhouette = document.createElement('canvas');
    silhouette.width = size;
    silhouette.height = size;
    const s = silhouette.getContext('2d');
    if (s) {
      s.drawImage(glyph, 0, 0);
      s.globalCompositeOperation = 'source-in';
      s.fillStyle = '#ffffff';
      s.fillRect(0, 0, size, size);
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        ctx.drawImage(silhouette, Math.cos(angle) * outline, Math.sin(angle) * outline);
      }
    }
  }
  ctx.drawImage(glyph, 0, 0);
  texture.refresh();
}

function createCoinTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURES.coin)) return;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xb7791f, 1).fillCircle(32, 35, 28);
  g.fillStyle(0xffc531, 1).fillCircle(32, 32, 28);
  g.fillStyle(0xffdf6e, 1).fillCircle(32, 32, 19);
  g.lineStyle(4, 0xe8a317, 1).strokeCircle(32, 32, 19);
  g.fillStyle(0xffffff, 0.75).fillEllipse(23, 21, 13, 7);
  g.generateTexture(TEXTURES.coin, 64, 66);
  g.destroy();
}

function createSparkTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURES.spark)) return;
  const size = 32;
  const texture = scene.textures.createCanvas(TEXTURES.spark, size, size);
  if (!texture) return;
  const ctx = texture.getContext();
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  texture.refresh();
}

function createShellTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURES.shell)) return;
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xfff3d6, 1).lineStyle(3, 0xd9b98a, 1);
  g.beginPath();
  g.moveTo(4, 20);
  g.lineTo(9, 6);
  g.lineTo(14, 13);
  g.lineTo(20, 3);
  g.lineTo(26, 18);
  g.lineTo(15, 26);
  g.closePath();
  g.fillPath();
  g.strokePath();
  g.generateTexture(TEXTURES.shell, 30, 30);
  g.destroy();
}
