import Phaser from 'phaser';
import { generateTextures, preloadCatalogImages } from '../view/textures.ts';

/** Prepara las texturas (imágenes del catálogo o emojis rasterizados) y arranca el juego. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    preloadCatalogImages(this);
  }

  create(): void {
    generateTextures(this);
    this.scene.start('Game');
    this.scene.launch('UI');
  }
}
