import Phaser from 'phaser';
import { BALANCE } from '../config/balance.ts';
import { FLOORS } from '../config/creatures.ts';
import { STRINGS } from '../config/strings.ts';
import { ANIM, COLORS, GAME_WIDTH, LAYOUT } from '../config/visuals.ts';
import { formatNumber } from '../core/format.ts';
import { creatureConfig, floorConfig, unlockRequirementLevel } from '../core/levels.ts';
import { TEXTURES } from '../view/textures.ts';
import { Button } from '../view/ui/Button.ts';
import { FloorTab } from '../view/ui/FloorTab.ts';
import type { Modal } from '../view/ui/Modal.ts';
import { openConfirmPopup, openDiscoveryPopup } from '../view/ui/popups.ts';
import { textStyle } from '../view/ui/textStyle.ts';
import { ToastQueue } from '../view/ui/Toast.ts';
import type { GameContext } from './context.ts';

const EGG_ROW_Y = LAYOUT.hud.y + 205;
const BAR = { x: LAYOUT.hud.x + 120, width: LAYOUT.hud.width - 290, height: 30 } as const;

/** Lo último que se mostró, para tocar los textos y gráficos solo cuando cambian. */
interface Shown {
  floor: number;
  coins: string;
  income: string;
  capacity: string;
  progress: number;
  full: boolean;
  counts: number[];
}

/**
 * HUD, pestañas de pisos y popups, encima del campo. Lee los valores continuos del modelo
 * en cada frame y reacciona a los eventos discretos (descubrimientos, desbloqueos, reinicio).
 */
export class UIScene extends Phaser.Scene {
  private readonly ctx: GameContext;
  private coinsText!: Phaser.GameObjects.Text;
  private incomeText!: Phaser.GameObjects.Text;
  private floorText!: Phaser.GameObjects.Text;
  private capacityText!: Phaser.GameObjects.Text;
  private eggIcon!: Phaser.GameObjects.Image;
  private eggBar!: Phaser.GameObjects.Graphics;
  private upperFloorText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerTween: Phaser.Tweens.Tween | null = null;
  private tabs: FloorTab[] = [];
  private toasts!: ToastQueue;
  private modal: Modal | null = null;
  private readonly discoveryQueue: number[] = [];
  private unsubscribers: (() => void)[] = [];
  private shown!: Shown;

  constructor(ctx: GameContext) {
    super('UI');
    this.ctx = ctx;
  }

  create(): void {
    this.shown = { floor: -1, coins: '', income: '', capacity: '', progress: -1, full: false, counts: [] };
    this.createHud();
    this.createBanner();
    this.tabs = FLOORS.map((_, floor) => new FloorTab(this, floor, (selected) => this.onTabSelected(selected)));
    this.add
      .text(GAME_WIDTH / 2, LAYOUT.hintY, STRINGS.hint, textStyle({ size: 32, weight: 500, stroke: false }))
      .setOrigin(0.5)
      .setAlpha(0.8);
    this.toasts = new ToastQueue(this);
    this.input.keyboard?.on('keydown-LEFT', () => this.stepFloor(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.stepFloor(1));

    const { model, ui } = this.ctx;
    this.unsubscribers = [
      model.events.on('creatureDiscovered', ({ level }) => this.queueDiscovery(level)),
      model.events.on('floorUnlocked', ({ floor }) => {
        this.toasts.push(STRINGS.floorUnlocked(floor, floorConfig(floor).name));
        this.tabs[floor]?.pulse();
      }),
      model.events.on('stateReset', () => {
        this.discoveryQueue.length = 0;
        this.toasts.clear();
      }),
      ui.on('toast', ({ text }) => this.toasts.push(text)),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const unsubscribe of this.unsubscribers) unsubscribe();
      this.unsubscribers = [];
    });
  }

  update(): void {
    const { model, view } = this.ctx;
    const shown = this.shown;
    const floor = view.floor;
    const floorChanged = floor !== shown.floor;
    if (floorChanged) {
      this.floorText.setText(STRINGS.floorLabel(floor, floorConfig(floor).name));
      // Los huevos caen solo en un piso; en los demás, la fila explica cómo se llenan.
      const eggFloor = floor === BALANCE.EGG_FLOOR;
      this.eggIcon.setVisible(eggFloor);
      this.eggBar.setVisible(eggFloor);
      this.upperFloorText.setVisible(!eggFloor).setText(eggFloor ? '' : STRINGS.upperFloorHint(floor - 1));
      shown.floor = floor;
    }

    const coins = formatNumber(Math.floor(model.coins));
    if (coins !== shown.coins) {
      if (shown.coins !== '') this.bump(this.coinsText);
      this.coinsText.setText(coins);
      shown.coins = coins;
    }

    const income = STRINGS.incomePerSecond(formatNumber(model.incomePerSecond));
    if (income !== shown.income) {
      this.incomeText.setText(income);
      shown.income = income;
    }

    const full = model.isFloorFull(floor);
    const capacity = STRINGS.capacity(model.floorCount(floor), BALANCE.FLOOR_CAPACITY);
    if (capacity !== shown.capacity || full !== shown.full || floorChanged) {
      this.capacityText.setText(capacity).setColor(full ? '#ff8a7a' : COLORS.textLight);
      shown.capacity = capacity;
    }

    const progress = model.eggProgress;
    if (Math.abs(progress - shown.progress) > 0.002 || full !== shown.full || floorChanged) {
      this.drawEggBar(progress, full);
      shown.progress = progress;
    }

    if (full !== shown.full || floorChanged) this.setBannerVisible(full);
    shown.full = full;

    this.tabs.forEach((tab, index) => {
      const count = model.floorCount(index);
      const unlocked = model.isFloorUnlocked(index);
      // Avisa cuando llega una criatura a otro piso (los huevos del piso 1 no, serían cada 5 s).
      const previous = shown.counts[index];
      if (previous !== undefined && count > previous && index !== floor && index !== BALANCE.EGG_FLOOR && unlocked) {
        tab.pulse();
      }
      shown.counts[index] = count;
      tab.render(index === floor, { unlocked, count, full: model.isFloorFull(index) });
    });
  }

  /** Botones y pestañas visibles, con su centro en coordenadas del juego (para el hook de debug). */
  debugButtons(): { label: string; x: number; y: number }[] {
    const buttons: { label: string; x: number; y: number }[] = [];
    const visit = (objects: Phaser.GameObjects.GameObject[]) => {
      for (const object of objects) {
        const label = object instanceof Button ? object.label : object instanceof FloorTab ? `tab:${object.floor + 1}` : null;
        if (label && object instanceof Phaser.GameObjects.Container && object.input?.enabled) {
          const bounds = object.getBounds();
          buttons.push({ label, x: bounds.centerX, y: bounds.centerY });
        }
        if (object instanceof Phaser.GameObjects.Container) visit(object.list);
      }
    };
    visit(this.children.list);
    return buttons;
  }

  private createHud(): void {
    const { hud } = LAYOUT;
    const left = hud.x + 40;
    const right = hud.x + hud.width - 40;
    this.add.graphics().fillStyle(COLORS.hudPanel, COLORS.hudPanelAlpha).fillRoundedRect(hud.x, hud.y, hud.width, hud.height, 40);

    this.add.image(left + 42, hud.y + 72, TEXTURES.coin).setDisplaySize(88, 90);
    this.coinsText = this.add
      .text(left + 104, hud.y + 74, '0', textStyle({ size: 80, weight: 700, align: 'left' }))
      .setOrigin(0, 0.5);
    this.incomeText = this.add
      .text(left + 108, hud.y + 142, '', textStyle({ size: 40, color: COLORS.textCoin, align: 'left' }))
      .setOrigin(0, 0.5);

    new Button(this, right - 125, hud.y + 72, {
      label: STRINGS.reset,
      width: 250,
      height: 88,
      color: COLORS.neutral,
      fontSize: 38,
      onClick: () => this.confirmReset(),
    });
    this.floorText = this.add.text(right, hud.y + 142, '', textStyle({ size: 38, align: 'right' })).setOrigin(1, 0.5);

    this.eggIcon = this.add.image(left + 36, EGG_ROW_Y, TEXTURES.egg).setDisplaySize(70, 70);
    this.eggBar = this.add.graphics();
    this.upperFloorText = this.add
      .text(left, EGG_ROW_Y, '', textStyle({ size: 30, weight: 500, stroke: false, align: 'left' }))
      .setOrigin(0, 0.5)
      .setAlpha(0.85)
      .setVisible(false);
    this.capacityText = this.add.text(right, EGG_ROW_Y, '', textStyle({ size: 42, align: 'right' })).setOrigin(1, 0.5);
  }

  private drawEggBar(progress: number, full: boolean): void {
    const { x, width, height } = BAR;
    const y = EGG_ROW_Y - height / 2;
    const g = this.eggBar.clear();
    g.fillStyle(COLORS.barBg, COLORS.barBgAlpha).fillRoundedRect(x, y, width, height, height / 2);
    if (progress <= 0) return;
    // Por debajo de una altura de ancho, el rectángulo redondeado se deforma.
    const fillWidth = Math.max(height, width * progress);
    g.fillStyle(full ? COLORS.barFull : COLORS.barFill, 1).fillRoundedRect(x, y, fillWidth, height, height / 2);
  }

  private createBanner(): void {
    const label = this.add.text(0, 0, STRINGS.fieldFull, textStyle({ size: 34, stroke: false })).setOrigin(0.5);
    const width = label.width + 64;
    const height = label.height + 24;
    const background = this.add.graphics();
    background.fillStyle(COLORS.danger, 0.94).fillRoundedRect(-width / 2, -height / 2, width, height, height / 2);
    this.banner = this.add.container(GAME_WIDTH / 2, LAYOUT.bannerY, [background, label]).setVisible(false).setDepth(800);
  }

  private setBannerVisible(visible: boolean): void {
    this.bannerTween?.stop();
    this.bannerTween = null;
    this.banner.setVisible(visible).setScale(1);
    if (!visible) return;
    this.bannerTween = this.tweens.add({
      targets: this.banner,
      scale: 1.05,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private bump(text: Phaser.GameObjects.Text): void {
    this.tweens.killTweensOf(text);
    this.tweens.add({ targets: text, scale: { from: 1.1, to: 1 }, duration: 220, ease: 'Quad.easeOut' });
  }

  private onTabSelected(floor: number): void {
    if (this.modal) return;
    if (!this.ctx.model.isFloorUnlocked(floor)) {
      const required = unlockRequirementLevel(floor);
      if (required !== null) this.toasts.push(STRINGS.floorLocked(floor, creatureConfig(required).name));
      return;
    }
    this.ctx.ui.emit('selectFloor', { floor });
  }

  private stepFloor(direction: 1 | -1): void {
    if (this.modal) return;
    const floor = this.ctx.model.adjacentUnlockedFloor(this.ctx.view.floor, direction);
    if (floor !== null) this.ctx.ui.emit('selectFloor', { floor });
  }

  private queueDiscovery(level: number): void {
    this.discoveryQueue.push(level);
    // Espera a que termine la animación que lo causó (apertura o merge).
    this.time.delayedCall(ANIM.discoveryDelayMs, () => this.showNextDiscovery());
  }

  private showNextDiscovery(): void {
    if (this.modal) return; // Se muestra al cerrar el popup actual.
    const level = this.discoveryQueue.shift();
    if (level === undefined) return;
    this.modal = openDiscoveryPopup(this, level, () => this.onModalClosed());
  }

  private confirmReset(): void {
    if (this.modal) return;
    this.modal = openConfirmPopup(
      this,
      {
        title: STRINGS.resetTitle,
        body: STRINGS.resetBody,
        confirmLabel: STRINGS.resetConfirm,
        cancelLabel: STRINGS.resetCancel,
        onConfirm: () => this.ctx.resetGame(),
      },
      () => this.onModalClosed(),
    );
  }

  private onModalClosed(): void {
    this.modal = null;
    this.time.delayedCall(150, () => this.showNextDiscovery());
  }
}
