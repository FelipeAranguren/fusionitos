import type Phaser from 'phaser';
import { BALANCE } from '../../config/balance.ts';
import { STRINGS } from '../../config/strings.ts';
import { COLORS } from '../../config/visuals.ts';
import { incomePerSecond } from '../../core/economy.ts';
import { formatNumber } from '../../core/format.ts';
import type { GameModel } from '../../core/GameModel.ts';
import { creatureConfig, floorConfig, levelOf } from '../../core/levels.ts';
import { TEXTURES, ensureCreatureTexture } from '../textures.ts';
import { Button } from './Button.ts';
import { Modal } from './Modal.ts';
import { roundedRect } from './shapes.ts';
import { textStyle } from './textStyle.ts';

const CARD = { width: 900, height: 1440 } as const;
const ROW = { firstY: -455, step: 168, width: 840, height: 150 } as const;
const dark = (size: number, weight: 500 | 600 | 700 = 600, color: string = COLORS.textDark) =>
  textStyle({ size, weight, color, stroke: false });

/**
 * Tienda del piso que se ve: una fila por criatura con su precio, o lo que falta para que se venda.
 * La UIScene llama a `refresh()` en cada frame mientras está abierta (las monedas cambian solas).
 */
export class ShopPopup {
  readonly modal: Modal;
  private readonly model: GameModel;
  private readonly floor: number;
  private readonly rows: ShopRow[];
  private readonly status: Phaser.GameObjects.Text;
  private statusShown: boolean | null = null;

  constructor(scene: Phaser.Scene, model: GameModel, floor: number, onClosed: () => void, onPurchased: () => void) {
    this.model = model;
    this.floor = floor;
    this.modal = new Modal(scene, CARD.width, CARD.height, onClosed);
    const card = this.modal.card;
    const title = scene.add.text(0, -640, STRINGS.shop, dark(60, 700)).setOrigin(0, 0.5);
    const icon = scene.add.image(0, -640, TEXTURES.shop).setDisplaySize(70, 70);
    // Ícono + título centrados como un bloque.
    const total = icon.displayWidth + 16 + title.width;
    icon.setX(-total / 2 + icon.displayWidth / 2);
    title.setX(icon.x + icon.displayWidth / 2 + 16);
    card.add([
      icon,
      title,
      scene.add.text(0, -575, STRINGS.floorLabel(floor, floorConfig(floor).name), dark(36, 500, COLORS.textMuted)).setOrigin(0.5),
    ]);

    this.rows = Array.from(
      { length: BALANCE.CREATURES_PER_FLOOR },
      (_, i) => new ShopRow(scene, card, model, levelOf(floor, i + 1), ROW.firstY + i * ROW.step, onPurchased),
    );
    this.status = scene.add.text(0, 540, '', { ...dark(30, 600), wordWrap: { width: 800 } }).setOrigin(0.5);
    card.add([
      this.status,
      new Button(scene, 0, 640, {
        label: STRINGS.close,
        width: 360,
        height: 104,
        color: COLORS.neutral,
        fontSize: 44,
        name: 'shop:close',
        onClick: () => this.modal.close(),
      }),
    ]);
    this.refresh();
  }

  refresh(): void {
    for (const row of this.rows) row.refresh();
    const full = this.model.isFloorFull(this.floor);
    if (full === this.statusShown) return;
    this.statusShown = full;
    this.status
      .setText(full ? STRINGS.shopFloorFull : STRINGS.shopRule(BALANCE.SHOP_LEVELS_BELOW_MAX))
      .setColor(full ? '#d9432f' : COLORS.textMuted);
  }
}

type RowStatus = 'unknown' | 'locked' | 'buyable';

/** Una fila: criatura, nombre, ingreso y botón de compra (o el candado con lo que falta). */
class ShopRow {
  private readonly scene: Phaser.Scene;
  private readonly model: GameModel;
  private readonly level: number;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly iconScale: number;
  private readonly name: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly lockText: Phaser.GameObjects.Text;
  private readonly buy: Button;
  private readonly onPurchased: () => void;
  private shown = '';

  constructor(
    scene: Phaser.Scene,
    card: Phaser.GameObjects.Container,
    model: GameModel,
    level: number,
    y: number,
    onPurchased: () => void,
  ) {
    this.scene = scene;
    this.model = model;
    this.level = level;
    this.onPurchased = onPurchased;
    const background = roundedRect(scene, 0, y, ROW.width, ROW.height, 32, COLORS.cardRow);
    this.icon = scene.add.image(-340, y, ensureCreatureTexture(scene, level)).setDisplaySize(120, 120);
    this.iconScale = this.icon.scaleX;
    this.name = scene.add.text(-260, y - 22, '', dark(40, 700)).setOrigin(0, 0.5);
    this.detail = scene.add.text(-260, y + 26, '', dark(30, 500, COLORS.textMuted)).setOrigin(0, 0.5);
    this.lockText = scene.add.text(275, y, '', dark(32, 600, COLORS.textMuted)).setOrigin(0.5);
    this.buy = new Button(scene, 275, y, {
      label: '',
      width: 250,
      height: 96,
      color: COLORS.primary,
      fontSize: 40,
      icon: TEXTURES.coin,
      name: `buy:${level}`,
      onClick: () => this.purchase(),
    });
    card.add([background, this.icon, this.name, this.detail, this.lockText, this.buy]);
  }

  refresh(): void {
    const { model, level } = this;
    const status: RowStatus =
      level > model.maxDiscoveredLevel ? 'unknown' : level > model.maxBuyableLevel ? 'locked' : 'buyable';
    const price = formatNumber(model.priceOf(level));
    const canBuy = status === 'buyable' && model.checkPurchase(level).ok;
    const key = `${status}|${price}|${canBuy}`;
    if (key === this.shown) return;
    this.shown = key;

    const creature = creatureConfig(level);
    // Las que no se descubrieron se ven como silueta, sin nombre: no se arruina la sorpresa.
    if (status === 'unknown') this.icon.setTintFill(0x000000).setAlpha(0.22);
    else this.icon.clearTint().setAlpha(status === 'locked' ? 0.55 : 1);
    this.name.setText(status === 'unknown' ? STRINGS.shopUnknown : creature.name);
    this.detail.setText(status === 'unknown' ? '' : STRINGS.incomePerSecond(formatNumber(incomePerSecond(level))));

    this.buy.setVisible(status === 'buyable').setLabel(price).setEnabled(canBuy);
    // Para que se venda hacen falta SHOP_LEVELS_BELOW_MAX descubrimientos por encima.
    const missing = level + BALANCE.SHOP_LEVELS_BELOW_MAX - model.maxDiscoveredLevel;
    this.lockText.setText(status === 'buyable' ? '' : status === 'unknown' ? '🔒' : `🔒 ${STRINGS.shopNeedsMore(missing)}`);
  }

  private purchase(): void {
    if (!this.model.buy(this.level).ok) return;
    this.onPurchased();
    this.scene.tweens.killTweensOf(this.icon);
    this.icon.setScale(this.iconScale);
    this.scene.tweens.add({ targets: this.icon, scale: this.iconScale * 1.2, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
  }
}
