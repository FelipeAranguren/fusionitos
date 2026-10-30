import Phaser from 'phaser';
import { EGG } from '../config/creatures.ts';
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
  shop: 'shop',
  sound: 'sound',
  music: 'music',
  install: 'install',
  account: 'account',
} as const;

const creatureTextureKey = (level: number): string => `creature-${level}`;
const decorTextureKey = (emoji: string): string => `decor-${emoji}`;

/**
 * Clave de la textura de una criatura. Se genera la primera vez que se pide: son 120 y la mayoría
 * no se ven hasta muy avanzada la partida.
 */
export function ensureCreatureTexture(scene: Phaser.Scene, level: number): string {
  const key = creatureTextureKey(level);
  createEmojiTexture(scene, key, creatureConfig(level).emoji, SIZES.emojiTexture, SIZES.emojiOutline);
  return key;
}

/** Clave de la textura de un emoji de decoración del campo; se genera la primera vez que se pide. */
export function ensureDecorTexture(scene: Phaser.Scene, emoji: string): string {
  const key = decorTextureKey(emoji);
  createEmojiTexture(scene, key, emoji, 128, 0);
  return key;
}

/** Encola en el loader las imágenes definidas en el catálogo. */
export function preloadCatalogImages(scene: Phaser.Scene): void {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const { image } = creatureConfig(level);
    if (image) scene.load.image(creatureTextureKey(level), image);
  }
  if (EGG.image) scene.load.image(TEXTURES.egg, EGG.image);
}

/**
 * Genera las texturas fijas que no vinieron como imagen: huevo, íconos, moneda, chispa y cáscara.
 * Las de criaturas y decoración se generan al usarlas (`ensureCreatureTexture`, `ensureDecorTexture`).
 */
export function generateTextures(scene: Phaser.Scene): void {
  createEmojiTexture(scene, TEXTURES.egg, EGG.emoji, SIZES.emojiTexture, SIZES.emojiOutline);
  createEmojiTexture(scene, TEXTURES.lock, ICONS.lock, 128, 4);
  createEmojiTexture(scene, TEXTURES.shop, ICONS.shop, 128, 4);
  createEmojiTexture(scene, TEXTURES.sound, ICONS.sound, 128, 4);
  createEmojiTexture(scene, TEXTURES.music, ICONS.music, 128, 4);
  createEmojiTexture(scene, TEXTURES.install, ICONS.install, 128, 4);
  createEmojiTexture(scene, TEXTURES.account, ICONS.account, 128, 4);
  createCoinTexture(scene);
  createSparkTexture(scene);
  createShellTexture(scene);
}

/**
 * Registra una textura dibujada en un canvas. En WebGL no se guarda el canvas sino sus píxeles: con la
 * pestaña en segundo plano el celular puede perder la GPU, y con ella el contenido de los canvas. Al
 * recuperar el contexto, Phaser vuelve a subir cada textura desde sus píxeles, que siguen en memoria.
 */
function addGeneratedTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void,
): void {
  if (scene.textures.exists(key)) return;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  draw(ctx, canvas);
  if (scene.renderer.type !== Phaser.WEBGL) {
    scene.textures.addCanvas(key, canvas);
    return;
  }
  const { data } = ctx.getImageData(0, 0, width, height);
  const texture = scene.textures.addUint8Array(key, new Uint8Array(data.buffer), width, height);
  // Phaser las crea con filtro NEAREST; LINEAR las suaviza al achicarlas, como a las de canvas.
  texture?.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Rasteriza un emoji centrado según la caja real del glifo, con borde blanco opcional tipo sticker. */
function createEmojiTexture(scene: Phaser.Scene, key: string, emoji: string, size: number, outline: number): void {
  addGeneratedTexture(scene, key, size, size, (ctx) => {
    const glyph = createCanvas(size, size);
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

    if (outline > 0) {
      const silhouette = createCanvas(size, size);
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
  });
}

function createCoinTexture(scene: Phaser.Scene): void {
  addGeneratedTexture(scene, TEXTURES.coin, 64, 66, (_ctx, canvas) => {
    const g = scene.make.graphics({}, false);
    g.fillStyle(0xb7791f, 1).fillCircle(32, 35, 28);
    g.fillStyle(0xffc531, 1).fillCircle(32, 32, 28);
    g.fillStyle(0xffdf6e, 1).fillCircle(32, 32, 19);
    g.lineStyle(4, 0xe8a317, 1).strokeCircle(32, 32, 19);
    g.fillStyle(0xffffff, 0.75).fillEllipse(23, 21, 13, 7);
    g.generateTexture(canvas, 64, 66);
    g.destroy();
  });
}

function createSparkTexture(scene: Phaser.Scene): void {
  const size = 32;
  addGeneratedTexture(scene, TEXTURES.spark, size, size, (ctx) => {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  });
}

function createShellTexture(scene: Phaser.Scene): void {
  addGeneratedTexture(scene, TEXTURES.shell, 30, 30, (_ctx, canvas) => {
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
    g.generateTexture(canvas, 30, 30);
    g.destroy();
  });
}
