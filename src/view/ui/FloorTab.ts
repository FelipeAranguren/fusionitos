import Phaser from 'phaser';
import { BALANCE } from '../../config/balance.ts';
import { FLOORS } from '../../config/creatures.ts';
import { STRINGS } from '../../config/strings.ts';
import { COLORS, GAME_WIDTH, LAYOUT } from '../../config/visuals.ts';
import { hatchLevel } from '../../core/levels.ts';
import { TEXTURES, ensureCreatureTexture } from '../textures.ts';
import { textStyle } from './textStyle.ts';

export interface FloorTabState {
  unlocked: boolean;
  count: number;
  full: boolean;
  /** Es el piso donde caen los huevos. */
  eggs: boolean;
}

const TABS = LAYOUT.tabs;
const STRIP_LEFT = TABS.marginX + TABS.arrowWidth + TABS.gap;
const STRIP_WIDTH = GAME_WIDTH - 2 * STRIP_LEFT;
const TAB_WIDTH = (STRIP_WIDTH - TABS.gap * (TABS.visible - 1)) / TABS.visible;
const CENTER_Y = TABS.top + TABS.height / 2;

/**
 * Pestaña de una de las posiciones visibles de la barra. Muestra el piso que le toca:
 * su primera criatura, el nombre y la ocupación; bloqueado, un candado.
 */
export class FloorTab extends Phaser.GameObjects.Container {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly eggBadge: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly countText: Phaser.GameObjects.Text;
  private shownFloor = -1;
  /** Lo último dibujado, para redibujar solo cuando cambia. */
  private drawn = '';
  private pressed = false;

  constructor(scene: Phaser.Scene, slot: number, onSelect: (floor: number) => void) {
    super(scene, STRIP_LEFT + TAB_WIDTH / 2 + slot * (TAB_WIDTH + TABS.gap), CENTER_Y);
    this.panel = scene.add.graphics();
    this.icon = scene.add.image(0, -32, TEXTURES.lock);
    this.eggBadge = scene.add.image(TAB_WIDTH / 2 - 26, -TABS.height / 2 + 26, TEXTURES.egg).setDisplaySize(40, 40);
    this.title = scene.add.text(0, 22, '', textStyle({ size: 28, weight: 700 })).setOrigin(0.5);
    this.countText = scene.add.text(0, 54, '', textStyle({ size: 26 })).setOrigin(0.5);
    this.add([this.panel, this.icon, this.title, this.countText, this.eggBadge]);

    this.setSize(TAB_WIDTH, TABS.height);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.pressed = true;
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.pressed = false;
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (!this.pressed || this.shownFloor < 0) return;
      this.pressed = false;
      onSelect(this.shownFloor);
    });
    scene.add.existing(this);
  }

  /** Piso que muestra ahora esta posición. */
  get floor(): number {
    return this.shownFloor;
  }

  render(floor: number, current: boolean, state: FloorTabState): void {
    const key = `${floor}|${current}|${state.unlocked}|${state.count}|${state.full}|${state.eggs}`;
    if (key === this.drawn) return;
    this.drawn = key;
    this.shownFloor = floor;

    const config = FLOORS[floor];
    const { radius } = TABS;
    const width = TAB_WIDTH;
    const height = TABS.height;
    const g = this.panel.clear();
    if (state.unlocked) {
      const line = current ? 8 : 4;
      g.fillStyle(0x000000, 0.25).fillRoundedRect(-width / 2, -height / 2 + 8, width, height, radius);
      g.fillStyle(config.fieldColor, current ? 1 : 0.75).fillRoundedRect(-width / 2, -height / 2, width, height, radius);
      g.lineStyle(line, current ? 0xffffff : config.accentColor, 1);
      g.strokeRoundedRect(-width / 2 + line / 2, -height / 2 + line / 2, width - line, height - line, radius - line / 2);
      this.icon.setTexture(ensureCreatureTexture(this.scene, hatchLevel(floor))).setDisplaySize(74, 74).setAlpha(1);
      this.fitTitle(config.name).setAlpha(1);
      this.countText
        .setText(STRINGS.capacity(state.count, BALANCE.FLOOR_CAPACITY))
        .setColor(state.full ? '#ff8a7a' : COLORS.textLight)
        .setVisible(true);
    } else {
      g.fillStyle(0x000000, 0.3).fillRoundedRect(-width / 2, -height / 2, width, height, radius);
      g.lineStyle(3, 0xffffff, 0.15).strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
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

/** Flecha a un costado de la barra de pestañas: corre la ventana de pisos visibles. */
export class TabArrow extends Phaser.GameObjects.Container {
  private readonly panel: Phaser.GameObjects.Graphics;
  private enabled = true;
  private pressed = false;

  constructor(scene: Phaser.Scene, side: -1 | 1, onPress: () => void) {
    const x = side < 0 ? TABS.marginX + TABS.arrowWidth / 2 : GAME_WIDTH - TABS.marginX - TABS.arrowWidth / 2;
    super(scene, x, CENTER_Y);
    const width = TABS.arrowWidth;
    const height = TABS.height - 20;
    this.panel = scene.add.graphics();
    this.panel.fillStyle(0x000000, 0.3).fillRoundedRect(-width / 2, -height / 2, width, height, 26);
    const arrow = scene.add.graphics();
    arrow.fillStyle(0xffffff, 1).fillTriangle(side * 16, 0, -side * 12, -24, -side * 12, 24);
    this.add([this.panel, arrow]);
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
