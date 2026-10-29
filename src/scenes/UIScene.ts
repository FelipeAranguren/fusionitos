import Phaser from 'phaser';
import { BALANCE } from '../config/balance.ts';
import { FLOORS } from '../config/creatures.ts';
import { STRINGS } from '../config/strings.ts';
import { ANIM, COLORS, GAME_WIDTH, LAYOUT } from '../config/visuals.ts';
import { formatNumber } from '../core/format.ts';
import { creatureConfig, floorConfig, unlockRequirementLevel } from '../core/levels.ts';
import type { Entity } from '../core/types.ts';
import { tabWindowStart } from '../view/tabWindow.ts';
import { TEXTURES } from '../view/textures.ts';
import { Button } from '../view/ui/Button.ts';
import { FloorTab, TabArrow } from '../view/ui/FloorTab.ts';
import { IconButton } from '../view/ui/IconButton.ts';
import { IconToggle } from '../view/ui/IconToggle.ts';
import type { Modal } from '../view/ui/Modal.ts';
import { openConfirmPopup, openDiscoveryPopup, openInstallHelpPopup, openWelcomePopup } from '../view/ui/popups.ts';
import { roundedRect } from '../view/ui/shapes.ts';
import { ShopPopup } from '../view/ui/ShopPopup.ts';
import { TabStrip } from '../view/ui/TabStrip.ts';
import { textStyle } from '../view/ui/textStyle.ts';
import { ToastQueue } from '../view/ui/Toast.ts';
import type { GameContext } from './context.ts';

const EGG_ROW_Y = LAYOUT.hud.y + 205;
const BAR = { x: LAYOUT.hud.x + 120, width: LAYOUT.hud.width - 290, height: 30 } as const;

/** Lo último que se mostró, para tocar los textos y gráficos solo cuando cambian. */
interface Shown {
  floor: number;
  eggFloor: number;
  coins: string;
  income: string;
  capacity: string;
  progress: number;
  full: boolean;
  /** Por piso, para avisar cuando cambian. */
  counts: number[];
  unlocked: boolean[];
  /** Si se ofrece el acceso directo (null: todavía no se miró). */
  installable: boolean | null;
}

/**
 * Lo que se muestra de a uno, en orden: el popup de una criatura nueva y el cierre de un piso
 * (persiana en ese piso y después el paso al piso de los huevos).
 */
type Step = { kind: 'discovery'; level: number } | { kind: 'closing'; floor: number; entities: readonly Readonly<Entity>[] };

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
  private eggBar!: Phaser.GameObjects.Container;
  private eggBarFill!: Phaser.GameObjects.Rectangle;
  /** En los demás pisos, en lugar de la barra: dónde caen los huevos (tocándolo, lleva ahí). */
  private eggHint!: Phaser.GameObjects.Container;
  private eggHintText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerTween: Phaser.Tweens.Tween | null = null;
  private tabStrip!: TabStrip;
  private hintText!: Phaser.GameObjects.Text;
  private installButton!: IconButton;
  private toasts!: ToastQueue;
  private modal: Modal | null = null;
  private shop: ShopPopup | null = null;
  private readonly steps: Step[] = [];
  /** Piso cuyo cierre se está mostrando. */
  private closingFloor: number | null = null;
  private unsubscribers: (() => void)[] = [];
  private shown!: Shown;

  constructor(ctx: GameContext) {
    super('UI');
    this.ctx = ctx;
  }

  create(): void {
    this.shown = {
      floor: -1,
      eggFloor: -1,
      coins: '',
      income: '',
      capacity: '',
      progress: -1,
      full: false,
      counts: [],
      unlocked: [],
      installable: null,
    };
    this.createHud();
    this.createBanner();
    this.createTabs();
    this.hintText = this.add
      .text(LAYOUT.hintX, LAYOUT.hintY, STRINGS.hint, textStyle({ size: 32, weight: 500, stroke: false, align: 'left' }))
      .setOrigin(0, 0.5)
      .setAlpha(0.8);
    const { resetButton } = LAYOUT;
    new Button(this, resetButton.x, LAYOUT.hintY, {
      label: STRINGS.reset,
      width: resetButton.width,
      height: resetButton.height,
      color: COLORS.neutral,
      fontSize: 30,
      name: 'reset',
      onClick: () => this.confirmReset(),
    });
    this.createAudioToggles();
    this.installButton = new IconButton(this, LAYOUT.installButtonX, LAYOUT.hintY, {
      icon: TEXTURES.install,
      size: LAYOUT.audioToggles.size,
      hitPadding: LAYOUT.audioToggles.hitPadding,
      color: COLORS.primary,
      name: 'install',
      onPress: () => void this.install(),
    }).setVisible(false);
    this.toasts = new ToastQueue(this);
    this.input.keyboard?.on('keydown-LEFT', () => this.stepFloor(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => this.stepFloor(1));
    // Todos los botones (también los de los popups) suenan al tocarlos; uno gris, a "no se puede".
    // Los de comprar tienen su propio sonido al concretar la compra.
    this.input.on(Phaser.Input.Events.GAMEOBJECT_DOWN, (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.GameObject) => {
      if (!(object instanceof Button)) return;
      if (!object.isEnabled) this.ctx.audio.play('denied');
      else if (!object.name.startsWith('buy:')) this.ctx.audio.play('click');
    });

    const { model, ui } = this.ctx;
    this.unsubscribers = [
      model.events.on('creatureDiscovered', ({ level }) => this.queueStep({ kind: 'discovery', level })),
      // La pestaña salta desde update(), cuando ya se acomodó la barra.
      model.events.on('floorUnlocked', ({ floor }) => this.toasts.push(STRINGS.floorUnlocked(floor, floorConfig(floor).name))),
      // Llega después del descubrimiento que lo causó: primero el popup, después la persiana.
      model.events.on('floorClosed', ({ floor, entities }) => this.queueStep({ kind: 'closing', floor, entities })),
      model.events.on('stateReset', () => {
        this.steps.length = 0;
        this.toasts.clear();
      }),
      ui.on('toast', ({ text }) => this.toasts.push(text)),
      ui.on('closingShown', ({ floor }) => this.finishClosing(floor)),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const unsubscribe of this.unsubscribers) unsubscribe();
      this.unsubscribers = [];
    });
  }

  update(): void {
    const { model, view } = this.ctx;
    const shown = this.shown;
    this.shop?.refresh();
    if (view.welcome && !this.busy) {
      this.modal = openWelcomePopup(this, view.welcome, () => this.onModalClosed());
      view.welcome = null;
      this.ctx.audio.play('welcome');
    }
    const floor = view.floor;
    const eggFloor = model.eggFloor;
    const floorChanged = floor !== shown.floor;
    const eggFloorChanged = eggFloor !== shown.eggFloor;
    if (floorChanged) this.floorText.setText(STRINGS.floorLabel(floor, floorConfig(floor).name));
    if (floorChanged || eggFloorChanged) {
      // Los huevos caen en un solo piso; en los demás, en lugar de la barra se dice en cuál.
      const eggsHere = floor === eggFloor;
      this.eggIcon.setAlpha(eggsHere ? 1 : 0.6);
      this.eggBar.setVisible(eggsHere);
      this.eggHint.setVisible(!eggsHere);
      this.eggHintText.setText(STRINGS.eggsFallOn(eggFloor));
      // Al arrancar se ubica de una; después, la barra se desliza hasta ahí.
      this.tabStrip.scrollTo(tabWindowStart(floor, eggFloor), shown.floor >= 0);
    }
    // Que los huevos subieron se avisa al final del cierre del piso de abajo (finishClosing).
    shown.floor = floor;
    shown.eggFloor = eggFloor;

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

    // El navegador puede avisar en cualquier momento que se puede instalar (y dejar de ofrecerlo al instalar).
    const installable = this.ctx.install.available;
    if (installable !== shown.installable) {
      this.installButton.setVisible(installable);
      this.fitHint(installable ? LAYOUT.installButtonX : LAYOUT.audioToggles.sfxX);
      shown.installable = installable;
    }

    this.updateTabs(floor, eggFloor);
  }

  /** Botones y pestañas visibles, con su centro en coordenadas del juego (para el hook de debug). */
  debugButtons(): { label: string; x: number; y: number }[] {
    const buttons: { label: string; x: number; y: number }[] = [];
    const visit = (objects: Phaser.GameObjects.GameObject[]) => {
      for (const object of objects) {
        const label =
          object instanceof Button
            ? object.name || object.label
            : object instanceof FloorTab
              ? `tab:${object.floor + 1}`
              : object instanceof IconButton || object instanceof TabArrow || object === this.eggHint
                ? object.name
                : null;
        // Las pestañas no atienden toques propios (lo hace la tira): valen las que están a la vista.
        const touchable = object instanceof FloorTab ? this.tabStrip.isVisible(object.floor) : object.input?.enabled;
        if (label && object instanceof Phaser.GameObjects.Container && object.visible && touchable) {
          // El área de toque está centrada en el contenedor (getBounds no cuenta los Graphics de adentro).
          const { tx, ty } = object.getWorldTransformMatrix();
          buttons.push({ label, x: tx, y: ty });
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
    roundedRect(this, hud.x + hud.width / 2, hud.y + hud.height / 2, hud.width, hud.height, 40, COLORS.hudPanel, COLORS.hudPanelAlpha);

    this.add.image(left + 42, hud.y + 72, TEXTURES.coin).setDisplaySize(88, 90);
    this.coinsText = this.add
      .text(left + 104, hud.y + 74, '0', textStyle({ size: 80, weight: 700, align: 'left' }))
      .setOrigin(0, 0.5);
    this.incomeText = this.add
      .text(left + 108, hud.y + 142, '', textStyle({ size: 40, color: COLORS.textCoin, align: 'left' }))
      .setOrigin(0, 0.5);

    new Button(this, right - 125, hud.y + 72, {
      label: STRINGS.shop,
      width: 250,
      height: 88,
      color: COLORS.primary,
      fontSize: 38,
      icon: TEXTURES.shop,
      name: 'shop',
      onClick: () => this.openShop(),
    });
    this.floorText = this.add.text(right, hud.y + 142, '', textStyle({ size: 38, align: 'right' })).setOrigin(1, 0.5);

    this.eggIcon = this.add.image(left + 36, EGG_ROW_Y, TEXTURES.egg).setDisplaySize(70, 70);
    const { x, width, height } = BAR;
    const barBack = roundedRect(this, x + width / 2, EGG_ROW_Y, width, height, height / 2, COLORS.barBg, COLORS.barBgAlpha);
    this.eggBarFill = roundedRect(this, x, EGG_ROW_Y, height, height, height / 2, COLORS.barFill).setOrigin(0, 0.5);
    this.eggBar = this.add.container(0, 0, [barBack, this.eggBarFill]);
    // Se toca en todo el ancho de la barra, no solo sobre las letras.
    this.eggHintText = this.add
      .text(-BAR.width / 2, 0, '', textStyle({ size: 32, weight: 600, stroke: false, align: 'left' }))
      .setOrigin(0, 0.5);
    this.eggHint = this.add
      .container(BAR.x + BAR.width / 2, EGG_ROW_Y, [this.eggHintText])
      .setSize(BAR.width, 80)
      .setName('eggs:go')
      .setVisible(false);
    let pressed = false;
    this.eggHint
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        pressed = true;
        this.eggHintText.setAlpha(0.6);
      })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
        pressed = false;
        this.eggHintText.setAlpha(1);
      })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        this.eggHintText.setAlpha(1);
        if (!pressed) return;
        pressed = false;
        this.goToEggFloor();
      });
    this.capacityText = this.add.text(right, EGG_ROW_Y, '', textStyle({ size: 42, align: 'right' })).setOrigin(1, 0.5);
  }

  private createAudioToggles(): void {
    const { audio } = this.ctx;
    const { audioToggles } = LAYOUT;
    new IconToggle(this, audioToggles.sfxX, LAYOUT.hintY, {
      icon: TEXTURES.sound,
      size: audioToggles.size,
      hitPadding: audioToggles.hitPadding,
      on: audio.sfxOn,
      name: 'toggle:sfx',
      onToggle: (on) => {
        audio.setSfx(on);
        audio.play('click'); // Al prender se escucha; al apagar ya no.
      },
    });
    new IconToggle(this, audioToggles.musicX, LAYOUT.hintY, {
      icon: TEXTURES.music,
      size: audioToggles.size,
      hitPadding: audioToggles.hitPadding,
      on: audio.musicOn,
      name: 'toggle:music',
      onToggle: (on) => {
        audio.setMusic(on);
        audio.play('click');
      },
    });
  }

  /** La pista se achica si no entra antes del primer botón redondo (`firstButtonX`, su centro). */
  private fitHint(firstButtonX: number): void {
    const available = firstButtonX - LAYOUT.audioToggles.size / 2 - LAYOUT.hintGap - LAYOUT.hintX;
    this.hintText.setScale(Math.min(1, available / this.hintText.width));
  }

  /** Acceso directo: el diálogo del navegador si lo hay; si no, los pasos para hacerlo a mano. */
  private async install(): Promise<void> {
    if (this.busy) return;
    this.ctx.audio.play('click');
    if (await this.ctx.install.prompt()) return;
    if (this.busy) return;
    this.modal = openInstallHelpPopup(this, this.ctx.install.platform, () => this.onModalClosed());
  }

  private drawEggBar(progress: number, full: boolean): void {
    this.eggBarFill.setVisible(progress > 0);
    if (progress <= 0) return;
    // Por debajo de una altura de ancho, el rectángulo redondeado se deforma.
    const fillWidth = Math.max(BAR.height, BAR.width * progress);
    this.eggBarFill.setSize(fillWidth, BAR.height).setFillStyle(full ? COLORS.barFull : COLORS.barFill, 1);
  }

  private createBanner(): void {
    const label = this.add.text(0, 0, STRINGS.fieldFull, textStyle({ size: 34, stroke: false })).setOrigin(0.5);
    const width = label.width + 64;
    const height = label.height + 24;
    const background = roundedRect(this, 0, 0, width, height, height / 2, COLORS.danger, 0.94);
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

  private createTabs(): void {
    this.tabStrip = new TabStrip(this, {
      onSelect: (floor) => this.onTabSelected(floor),
      onPage: () => this.ctx.audio.play('click'),
    });
  }

  /** Pestañas y flechas; de paso, avisa lo que pasa en otros pisos. */
  private updateTabs(floor: number, eggFloor: number): void {
    const { model } = this.ctx;
    const shown = this.shown;
    for (let index = 0; index < FLOORS.length; index++) {
      const count = model.floorCount(index);
      const unlocked = model.isFloorUnlocked(index);
      // Salta al desbloquearse y cuando le llega una criatura desde otro piso
      // (al de los huevos no: sería cada 5 s).
      const opened = shown.unlocked[index] === false && unlocked;
      const previous = shown.counts[index];
      const arrived = previous !== undefined && count > previous && index !== floor && index !== eggFloor && unlocked;
      if (opened || arrived) this.tabStrip.attention(index);
      shown.counts[index] = count;
      shown.unlocked[index] = unlocked;
    }
    this.tabStrip.render(floor, (index) => ({
      unlocked: shown.unlocked[index],
      closed: model.isFloorClosed(index),
      count: shown.counts[index],
      full: model.isFloorFull(index),
      eggs: index === eggFloor,
    }));
  }

  /**
   * Hay algo en pantalla o por mostrarse (popup, cierre de un piso): mientras tanto no se cambia
   * de piso ni se abren la tienda u otros popups.
   */
  private get busy(): boolean {
    return this.modal !== null || this.closingFloor !== null || this.steps.length > 0;
  }

  private onTabSelected(floor: number): void {
    if (this.busy) return;
    const { model } = this.ctx;
    if (model.isFloorClosed(floor)) {
      this.ctx.audio.play('denied');
      this.toasts.push(STRINGS.floorClosed(floor, floorConfig(floor).name));
      return;
    }
    if (!model.isFloorUnlocked(floor)) {
      this.ctx.audio.play('denied');
      // Para el piso que sigue se dice qué fusionar; más arriba no, para no adelantar criaturas.
      const required = unlockRequirementLevel(floor);
      const next = floor > 0 && model.isFloorUnlocked(floor - 1);
      if (required !== null && next) this.toasts.push(STRINGS.floorLocked(floor, creatureConfig(required).name));
      else this.toasts.push(STRINGS.floorLockedAfter(floor));
      return;
    }
    if (floor === this.ctx.view.floor) this.ctx.audio.play('click');
    this.ctx.ui.emit('selectFloor', { floor });
  }

  private goToEggFloor(): void {
    if (this.busy) return;
    this.ctx.ui.emit('selectFloor', { floor: this.ctx.model.eggFloor });
  }

  private stepFloor(direction: 1 | -1): void {
    if (this.busy) return;
    const floor = this.ctx.model.adjacentOpenFloor(this.ctx.view.floor, direction);
    if (floor !== null) this.ctx.ui.emit('selectFloor', { floor });
  }

  private queueStep(step: Step): void {
    this.steps.push(step);
    // Espera a que termine la animación que lo causó (apertura o merge).
    this.time.delayedCall(ANIM.discoveryDelayMs, () => this.runNextStep());
  }

  /** Muestra lo próximo de la cola, si no hay otra cosa en pantalla (si la hay, sigue cuando termine). */
  private runNextStep(): void {
    if (this.modal || this.closingFloor !== null) return;
    const step = this.steps.shift();
    if (!step) return;
    if (step.kind === 'discovery') {
      this.modal = openDiscoveryPopup(this, step.level, () => this.onModalClosed());
      this.ctx.audio.play('discover');
      return;
    }
    // El campo va a ese piso, baja la persiana y avisa con closingShown.
    const { floor } = step;
    this.closingFloor = floor;
    this.ctx.ui.emit('showClosing', { floor, entities: step.entities });
    // Por si el campo no llega a avisar: la interfaz no puede quedar trabada.
    this.time.delayedCall(ANIM.closingTimeoutMs, () => this.finishClosing(floor));
  }

  /** Terminó la persiana: se pasa al piso de los huevos y se avisa que ahora caen ahí. */
  private finishClosing(floor: number): void {
    if (this.closingFloor !== floor) return; // Ya terminó (el aviso y el plazo de respaldo llaman los dos).
    this.closingFloor = null;
    const eggFloor = this.ctx.model.eggFloor;
    this.ctx.ui.emit('selectFloor', { floor: eggFloor });
    this.time.delayedCall(ANIM.floorFadeMs * 2, () => {
      this.toasts.push(STRINGS.eggFloorMoved(eggFloor, floorConfig(eggFloor).name));
      this.tabStrip.attention(eggFloor);
      this.runNextStep();
    });
  }

  /** La tienda del piso que se ve. */
  private openShop(): void {
    if (this.busy) return;
    this.shop = new ShopPopup(
      this,
      this.ctx.model,
      this.ctx.view.floor,
      () => {
        this.shop = null;
        this.onModalClosed();
      },
      () => this.ctx.audio.play('purchase'),
    );
    this.modal = this.shop.modal;
  }

  private confirmReset(): void {
    if (this.busy) return;
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
    this.time.delayedCall(150, () => this.runNextStep());
  }
}
