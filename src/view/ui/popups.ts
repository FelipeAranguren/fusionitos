import type Phaser from 'phaser';
import { BALANCE } from '../../config/balance.ts';
import { STRINGS } from '../../config/strings.ts';
import { COLORS } from '../../config/visuals.ts';
import { incomePerSecond, type OfflineEarnings } from '../../core/economy.ts';
import { formatDuration, formatNumber } from '../../core/format.ts';
import { creatureConfig, floorConfig, floorOfLevel, tierOfLevel } from '../../core/levels.ts';
import { TEXTURES, creatureTextureKey } from '../textures.ts';
import { Button } from './Button.ts';
import { Modal } from './Modal.ts';
import { textStyle } from './textStyle.ts';

const dark = (size: number, weight: 500 | 600 | 700 = 600, color: string = COLORS.textDark) =>
  textStyle({ size, weight, color, stroke: false });

/** "¡Nueva criatura descubierta!": la criatura en grande, con rayos girando detrás. */
export function openDiscoveryPopup(scene: Phaser.Scene, level: number, onClosed: () => void): Modal {
  const modal = new Modal(scene, 860, 1060, onClosed);
  const floor = floorOfLevel(level);
  const floorCfg = floorConfig(floor);

  const rays = scene.add.graphics();
  rays.fillStyle(floorCfg.accentColor, 0.28);
  const count = 14;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const b = a + Math.PI / count;
    rays.fillTriangle(0, 0, Math.cos(a) * 330, Math.sin(a) * 330, Math.cos(b) * 330, Math.sin(b) * 330);
  }
  rays.setY(-120);
  scene.tweens.add({ targets: rays, angle: 360, duration: 14_000, repeat: -1 });

  const glow = scene.add.circle(0, -120, 185, floorCfg.fieldColor, 1);
  const creature = scene.add.image(0, -120, creatureTextureKey(level)).setDisplaySize(330, 330);
  const baseScale = creature.scaleX;
  creature.setScale(0);
  scene.tweens.add({ targets: creature, scale: baseScale, duration: 520, delay: 120, ease: 'Back.easeOut(2.5)' });

  modal.card.add([
    rays,
    glow,
    creature,
    scene.add.text(0, -440, STRINGS.discoveryTitle, dark(54, 700)).setOrigin(0.5),
    scene.add.text(0, 125, creatureConfig(level).name, dark(76, 700)).setOrigin(0.5),
    scene.add
      .text(0, 205, STRINGS.discoveryDetail(floor, floorCfg.name, tierOfLevel(level)), dark(36, 500, COLORS.textMuted))
      .setOrigin(0.5),
    scene.add
      .text(0, 268, STRINGS.discoveryIncome(formatNumber(incomePerSecond(level))), dark(38, 600, '#b07a10'))
      .setOrigin(0.5),
    new Button(scene, 0, 410, {
      label: STRINGS.discoveryOk,
      width: 440,
      height: 120,
      color: COLORS.primary,
      fontSize: 52,
      onClick: () => modal.close(),
    }),
  ]);
  return modal;
}

/** Bienvenida tras una ausencia: cuánto tiempo pasó y cuánto juntaron las criaturas. */
export function openWelcomePopup(scene: Phaser.Scene, earnings: OfflineEarnings, onClosed: () => void): Modal {
  const modal = new Modal(scene, 860, 880, onClosed);
  const amount = scene.add.text(0, -40, STRINGS.coinPop(formatNumber(earnings.amount)), dark(92, 700, '#b07a10')).setOrigin(0, 0.5);
  const coin = scene.add.image(0, -40, TEXTURES.coin).setDisplaySize(96, 98);
  const total = coin.displayWidth + 18 + amount.width;
  coin.setX(-total / 2 + coin.displayWidth / 2);
  amount.setX(coin.x + coin.displayWidth / 2 + 18);
  // La escala base de la moneda no es 1 (setDisplaySize): cada uno crece hasta la suya.
  const coinScale = coin.scaleX;
  coin.setScale(coinScale * 0.4);
  amount.setScale(0.4);
  scene.tweens.add({ targets: coin, scale: coinScale, duration: 480, delay: 150, ease: 'Back.easeOut(2.5)' });
  scene.tweens.add({ targets: amount, scale: 1, duration: 480, delay: 150, ease: 'Back.easeOut(2.5)' });

  modal.card.add([
    scene.add.text(0, -340, STRINGS.welcomeTitle, dark(60, 700)).setOrigin(0.5),
    scene.add.text(0, -250, STRINGS.welcomeAway(formatDuration(earnings.awayMs)), dark(40, 500, COLORS.textMuted)).setOrigin(0.5),
    scene.add.text(0, -160, STRINGS.welcomeEarned, dark(40, 600)).setOrigin(0.5),
    coin,
    amount,
    scene.add
      .text(0, 80, STRINGS.welcomeNote(BALANCE.OFFLINE_INCOME_RATE * 100, BALANCE.OFFLINE_MAX_HOURS), dark(30, 500, COLORS.textMuted))
      .setOrigin(0.5),
    new Button(scene, 0, 300, {
      label: STRINGS.welcomeOk,
      width: 440,
      height: 120,
      color: COLORS.primary,
      fontSize: 52,
      onClick: () => modal.close(),
    }),
  ]);
  return modal;
}

export interface ConfirmOptions {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
}

export function openConfirmPopup(scene: Phaser.Scene, options: ConfirmOptions, onClosed: () => void): Modal {
  const modal = new Modal(scene, 860, 620, onClosed);
  modal.card.add([
    scene.add.text(0, -210, options.title, dark(58, 700)).setOrigin(0.5),
    scene.add.text(0, -70, options.body, { ...dark(40, 500, COLORS.textMuted), align: 'center' }).setOrigin(0.5),
    new Button(scene, -195, 170, {
      label: options.cancelLabel,
      width: 340,
      height: 116,
      color: COLORS.neutral,
      fontSize: 42,
      onClick: () => modal.close(),
    }),
    new Button(scene, 195, 170, {
      label: options.confirmLabel,
      width: 340,
      height: 116,
      color: COLORS.danger,
      fontSize: 42,
      onClick: () => {
        modal.close();
        options.onConfirm();
      },
    }),
  ]);
  return modal;
}
