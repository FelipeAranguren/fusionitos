import Phaser from 'phaser';
import { BALANCE } from '../../config/balance.ts';
import { FLOORS } from '../../config/creatures.ts';
import { STRINGS } from '../../config/strings.ts';
import { COLORS, GAME_WIDTH, LAYOUT, SHUTTER } from '../../config/visuals.ts';
import { hatchLevel } from '../../core/levels.ts';
import { TEXTURES, ensureCreatureTexture } from '../textures.ts';
import { RoundedFrame, roundedRect } from './shapes.ts';
import { textStyle } from './textStyle.ts';

export interface FloorTabState {
  unlocked: boolean;
  /** Quedó por debajo del piso de los huevos: persiana baja y candado. */
  closed: boolean;
  count: number;
  full: boolean;
  /** Es el piso donde caen los huevos. */
  eggs: boolean;
}

const TABS = LAYOUT.tabs;
/** La tira de pestañas va entre las dos flechas. */
export const STRIP_LEFT = TABS.marginX + TABS.arrowWidth + TABS.gap;
export const STRIP_WIDTH = GAME_WIDTH - 2 * STRIP_LEFT;
export const TAB_WIDTH = (STRIP_WIDTH - TABS.gap * (TABS.visible - 1)) / TABS.visible;
/** Distancia entre los bordes izquierdos de dos pestañas vecinas. */
export const TAB_PITCH = TAB_WIDTH + TABS.gap;
const CENTER_Y = TABS.top + TABS.height / 2;

/**
 * Pestaña de un piso: su primera criatura, el nombre y la ocupación; bloqueado, un candado.
 * Va dentro de la tira deslizable (`TabStrip`), que es la que atiende los toques.
 */
export class FloorTab extends Phaser.GameObjects.Container {
  private readonly shadow: Phaser.GameObjects.Rectangle;
  private readonly face: Phaser.GameObjects.Rectangle;
  private readonly slats: Phaser.GameObjects.Graphics;
  private readonly edge: RoundedFrame;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly eggBadge: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly countText: Phaser.GameObjects.Text;
  private readonly tabFloor: number;
  /** Lo último dibujado, para redibujar solo cuando cambia. */
  private drawn = '';

  /** Se ubica en la tira según su piso: la del Piso 1 empieza en x = 0. */
  constructor(scene: Phaser.Scene, floor: number) {
    super(scene, TAB_WIDTH / 2 + floor * TAB_PITCH, CENTER_Y);
    this.tabFloor = floor;
    const { radius, height } = TABS;
    this.shadow = roundedRect(scene, 0, 8, TAB_WIDTH, height, radius, 0x000000, 0.25);
    this.face = roundedRect(scene, 0, 0, TAB_WIDTH, height, radius, 0x000000, 0.3);
    this.slats = scene.add.graphics();
    // Tablillas de la persiana (pisos cerrados): rectángulos, que no cuestan nada dibujar.
    for (let y = -height / 2 + 30; y < height / 2 - 14; y += 26) {
      this.slats.fillStyle(SHUTTER.dark, 0.7).fillRect(-TAB_WIDTH / 2 + 6, y, TAB_WIDTH - 12, 4);
    }
    this.edge = new RoundedFrame(scene, 0, 0, TAB_WIDTH, height, radius, 3, 0xffffff, 0.15);
    this.icon = scene.add.image(0, -32, TEXTURES.lock);
    this.eggBadge = scene.add.image(TAB_WIDTH / 2 - 26, -height / 2 + 26, TEXTURES.egg).setDisplaySize(40, 40);
    this.title = scene.add.text(0, 22, '', textStyle({ size: 28, weight: 700 })).setOrigin(0.5);
    this.countText = scene.add.text(0, 54, '', textStyle({ size: 26 })).setOrigin(0.5);
    this.add([this.shadow, this.face, this.slats, this.edge, this.icon, this.title, this.countText, this.eggBadge]);
  }

  get floor(): number {
    return this.tabFloor;
  }

  render(current: boolean, state: FloorTabState): void {
    const key = `${current}|${state.unlocked}|${state.closed}|${state.count}|${state.full}|${state.eggs}`;
    if (key === this.drawn) return;
    this.drawn = key;

    const floor = this.tabFloor;
    const config = FLOORS[floor];
    const line = current ? 8 : 4;
    this.shadow.setVisible(state.unlocked);
    this.slats.setVisible(state.unlocked && state.closed);
    if (state.unlocked && state.closed) {
      // Persiana baja: tablillas marrones, candado y el nombre apagado.
      this.face.setFillStyle(SHUTTER.color, 1);
      this.edge.setLine(line, current ? 0xffffff : SHUTTER.frame);
      this.icon.setTexture(TEXTURES.lock).setDisplaySize(58, 58).setAlpha(1);
      this.fitTitle(config.name).setAlpha(0.75);
      this.countText.setVisible(false);
    } else if (state.unlocked) {
      this.face.setFillStyle(config.fieldColor, current ? 1 : 0.75);
      this.edge.setLine(line, current ? 0xffffff : config.accentColor);
      this.icon.setTexture(ensureCreatureTexture(this.scene, hatchLevel(floor))).setDisplaySize(74, 74).setAlpha(1);
      this.fitTitle(config.name).setAlpha(1);
      this.countText
        .setText(STRINGS.capacity(state.count, BALANCE.FLOOR_CAPACITY))
        .setColor(state.full ? '#ff8a7a' : COLORS.textLight)
        .setVisible(true);
    } else {
      this.face.setFillStyle(0x000000, 0.3);
      this.edge.setLine(3, 0xffffff, 0.15);
      this.icon.setTexture(TEXTURES.lock).setDisplaySize(58, 58).setAlpha(0.85);
      this.fitTitle(STRINGS.floorTab(floor)).setAlpha(0.55);
      this.countText.setVisible(false);
    }
    this.eggBadge.setVisible(state.eggs);
    // La pestaña del piso que se ve queda levantada.
    this.setY(CENTER_Y - (current ? 10 : 0));
  }

  /** Llama la atención: se desbloqueó o le llegó una criatura. */
  pulse(): void {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1);
    this.scene.tweens.add({ targets: this, scale: 1.12, duration: 150, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
  }

  /** Nombres largos ("Reino mágico") se achican para entrar en la pestaña. */
  private fitTitle(text: string): Phaser.GameObjects.Text {
    this.title.setScale(1).setText(text);
    const available = TAB_WIDTH - 18;
    if (this.title.width > available) this.title.setScale(available / this.title.width);
    return this.title;
  }
}

/** Flecha a un costado de la barra de pestañas: la corre una página. */
export class TabArrow extends Phaser.GameObjects.Container {
  private enabled = true;
  private pressed = false;

  constructor(scene: Phaser.Scene, side: -1 | 1, onPress: () => void) {
    const x = side < 0 ? TABS.marginX + TABS.arrowWidth / 2 : GAME_WIDTH - TABS.marginX - TABS.arrowWidth / 2;
    super(scene, x, CENTER_Y);
    const width = TABS.arrowWidth;
    const height = TABS.height - 20;
    const panel = roundedRect(scene, 0, 0, width, height, 26, 0x000000, 0.3);
    // Un triángulo en Graphics no tiene curvas: no hay que triangularlo en cada frame.
    const arrow = scene.add.graphics();
    arrow.fillStyle(0xffffff, 1).fillTriangle(side * 16, 0, -side * 12, -24, -side * 12, 24);
    this.add([panel, arrow]);
    this.setName(side < 0 ? 'tabs:prev' : 'tabs:next');

    this.setSize(width + 16, height);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.pressed = this.enabled;
      if (this.enabled) this.setScale(0.92);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.pressed = false;
      this.setScale(1);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.setScale(1);
      if (!this.pressed) return;
      this.pressed = false;
      onPress();
    });
    scene.add.existing(this);
  }

  /** Deshabilitada (no hay más pisos de ese lado) se ve apagada y no responde. */
  setEnabled(enabled: boolean): this {
    if (enabled === this.enabled) return this;
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.3);
    return this;
  }

  /** Avisa que pasó algo en un piso que quedó de ese lado, fuera de la vista. */
  pulse(): void {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1);
    this.scene.tweens.add({ targets: this, scale: 1.2, duration: 150, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
  }
}
