import Phaser from 'phaser';
import { BALANCE } from '../../config/balance.ts';
import { FLOORS } from '../../config/creatures.ts';
import { STRINGS } from '../../config/strings.ts';
import { COLORS, GAME_WIDTH, LAYOUT } from '../../config/visuals.ts';
import { hatchLevel } from '../../core/levels.ts';
import { TEXTURES, creatureTextureKey } from '../textures.ts';
import { textStyle } from './textStyle.ts';

export interface FloorTabState {
  unlocked: boolean;
  count: number;
  full: boolean;
}

const TABS = LAYOUT.tabs;
const TAB_WIDTH = (GAME_WIDTH - TABS.marginX * 2 - TABS.gap * (FLOORS.length - 1)) / FLOORS.length;
const CENTER_Y = TABS.top + TABS.height / 2;

/** Pestaña de un piso: su primera criatura, el nombre y la ocupación. Bloqueado, un candado. */
export class FloorTab extends Phaser.GameObjects.Container {
  readonly floor: number;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly countText: Phaser.GameObjects.Text;
  /** Lo último dibujado, para redibujar solo cuando cambia. */
  private drawn = '';
  private pressed = false;

  constructor(scene: Phaser.Scene, floor: number, onSelect: (floor: number) => void) {
    super(scene, TABS.marginX + TAB_WIDTH / 2 + floor * (TAB_WIDTH + TABS.gap), CENTER_Y);
    this.floor = floor;
    this.panel = scene.add.graphics();
    this.icon = scene.add.image(0, -32, TEXTURES.lock);
    this.title = scene.add.text(0, 22, '', textStyle({ size: 30, weight: 700 })).setOrigin(0.5);
    this.countText = scene.add.text(0, 54, '', textStyle({ size: 26 })).setOrigin(0.5);
    this.add([this.panel, this.icon, this.title, this.countText]);

    this.setSize(TAB_WIDTH, TABS.height);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.pressed = true;
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.pressed = false;
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (!this.pressed) return;
      this.pressed = false;
      onSelect(this.floor);
    });
    scene.add.existing(this);
  }

  render(current: boolean, state: FloorTabState): void {
    const key = `${current}|${state.unlocked}|${state.count}|${state.full}`;
    if (key === this.drawn) return;
    this.drawn = key;

    const config = FLOORS[this.floor];
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
      this.icon.setTexture(creatureTextureKey(hatchLevel(this.floor))).setDisplaySize(74, 74).setAlpha(1);
      this.title.setText(config.name).setAlpha(1);
      this.countText
        .setText(STRINGS.capacity(state.count, BALANCE.FLOOR_CAPACITY))
        .setColor(state.full ? '#ff8a7a' : COLORS.textLight)
        .setVisible(true);
    } else {
      g.fillStyle(0x000000, 0.3).fillRoundedRect(-width / 2, -height / 2, width, height, radius);
      g.lineStyle(3, 0xffffff, 0.15).strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
      this.icon.setTexture(TEXTURES.lock).setDisplaySize(58, 58).setAlpha(0.85);
      this.title.setText(STRINGS.floorTab(this.floor)).setAlpha(0.55);
      this.countText.setVisible(false);
    }
    // La pestaña del piso que se ve queda levantada.
    this.setY(CENTER_Y - (current ? 10 : 0));
  }

  /** Llama la atención: se desbloqueó o le llegó una criatura. */
  pulse(): void {
    this.scene.tweens.killTweensOf(this);
    this.setScale(1);
    this.scene.tweens.add({ targets: this, scale: 1.12, duration: 150, yoyo: true, repeat: 1, ease: 'Quad.easeOut' });
  }
}
