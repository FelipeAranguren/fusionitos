import Phaser from 'phaser';
import { FLOORS } from '../../config/creatures.ts';
import { LAYOUT, TAB_SCROLL } from '../../config/visuals.ts';
import { clampTabStart, dragTabPosition, lastTabStart, pageTabWindow, settleTabPosition } from '../tabWindow.ts';
import { FloorTab, type FloorTabState, STRIP_LEFT, STRIP_WIDTH, TAB_PITCH, TAB_WIDTH, TabArrow } from './FloorTab.ts';

const TABS = LAYOUT.tabs;

interface Drag {
  pointerId: number;
  /** Dónde estaban el dedo y la barra al empezar a arrastrar. */
  startX: number;
  startPosition: number;
  /** Hasta pasar el umbral, el toque puede ser solo eso: un toque sobre una pestaña. */
  dragging: boolean;
  /** Últimas posiciones del dedo, para medir su velocidad al soltar. */
  samples: { x: number; time: number }[];
}

export interface TabStripOptions {
  /** Se tocó (sin arrastrar) la pestaña de un piso. */
  onSelect(floor: number): void;
  /** Una flecha corrió la barra. */
  onPage(): void;
}

/**
 * Barra de pestañas de pisos: una tira con todas las pestañas que se ve entre las dos flechas.
 * Se desliza con el dedo (o la rueda del mouse) y al soltarla se acomoda en una pestaña entera;
 * las flechas la corren una página. La posición es el primer piso a la vista (ver tabWindow.ts).
 */
export class TabStrip {
  readonly tabs: FloorTab[];
  private readonly scene: Phaser.Scene;
  private readonly strip: Phaser.GameObjects.Container;
  private readonly arrows: [TabArrow, TabArrow];
  private readonly options: TabStripOptions;
  private tween: Phaser.Tweens.Tween | null = null;
  /** Hacia dónde va la barra; quieta o mientras se arrastra, es su posición. */
  private goal = 0;
  private drag: Drag | null = null;
  /** Giro de la rueda que todavía no llegó a una pestaña. */
  private wheel = 0;

  constructor(scene: Phaser.Scene, options: TabStripOptions) {
    this.scene = scene;
    this.options = options;
    this.tabs = FLOORS.map((_, floor) => new FloorTab(scene, floor));
    this.strip = scene.add.container(STRIP_LEFT, 0, this.tabs);
    // Las pestañas que salen de la tira (debajo de las flechas) no se ven. Arriba y abajo
    // queda lugar para la pestaña levantada, su sombra y el latido.
    const shape = scene.make.graphics({}, false);
    shape.fillStyle(0xffffff, 1).fillRect(STRIP_LEFT - TABS.gap / 2, TABS.top - 40, STRIP_WIDTH + TABS.gap, TABS.height + 70);
    this.strip.setMask(shape.createGeometryMask());

    // Los toques los atiende la tira entera: así se distingue tocar una pestaña de arrastrar la barra.
    const zone = scene.add.zone(STRIP_LEFT, TABS.top - 10, STRIP_WIDTH, TABS.height + 10).setOrigin(0);
    zone.setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) => this.startDrag(pointer));
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_WHEEL, (_pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number) =>
      this.turnWheel(Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY),
    );
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.moveDrag(pointer));
    scene.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => this.endDrag(pointer));
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, (pointer: Phaser.Input.Pointer) => this.endDrag(pointer));

    this.arrows = [new TabArrow(scene, -1, () => this.page(-1)), new TabArrow(scene, 1, () => this.page(1))];
  }

  /** Dibuja cada pestaña con el estado de su piso. Se llama en cada frame: solo redibuja lo que cambió. */
  render(current: number, stateOf: (floor: number) => FloorTabState): void {
    // Solo se dibujan las que asoman entre las flechas: el resto, aunque la máscara las tape, costaría igual.
    const position = this.position;
    for (const tab of this.tabs) {
      tab.render(tab.floor === current, stateOf(tab.floor));
      tab.setVisible(tab.floor + 1 > position && tab.floor < position + TABS.visible);
    }
    const [previous, next] = this.arrows;
    previous.setEnabled(this.goal > 0);
    next.setEnabled(this.goal < lastTabStart());
  }

  /** Lleva la barra a un primer piso (animada, o de una al arrancar). No interrumpe un arrastre. */
  scrollTo(first: number, animate: boolean): void {
    if (this.drag?.dragging) return;
    this.moveTo(clampTabStart(first), animate);
  }

  /** Si la pestaña de un piso está a la vista, o lo va a estar cuando la barra termine de moverse. */
  isVisible(floor: number): boolean {
    const center = floor + 0.5;
    return center > this.goal && center < this.goal + TABS.visible;
  }

  /** Hace latir la pestaña de un piso; si no está a la vista, la flecha de ese lado. */
  attention(floor: number): void {
    if (this.isVisible(floor)) this.tabs[floor].pulse();
    else this.arrows[floor < this.goal ? 0 : 1].pulse();
  }

  private get position(): number {
    return (STRIP_LEFT - this.strip.x) / TAB_PITCH;
  }

  private moveTo(position: number, animate: boolean): void {
    this.tween?.stop();
    this.tween = null;
    this.goal = position;
    const x = STRIP_LEFT - position * TAB_PITCH;
    if (!animate || Math.abs(x - this.strip.x) < 0.5) {
      this.strip.x = x;
      return;
    }
    this.tween = this.scene.tweens.add({ targets: this.strip, x, duration: TAB_SCROLL.snapMs, ease: 'Cubic.easeOut' });
  }

  private page(direction: -1 | 1): void {
    const first = pageTabWindow(Math.round(this.goal), direction);
    if (first === this.goal) return;
    this.moveTo(first, true);
    this.options.onPage();
  }

  private turnWheel(delta: number): void {
    this.wheel += delta;
    const steps = Math.trunc(this.wheel / TAB_SCROLL.wheelStep);
    if (steps === 0) return;
    this.wheel -= steps * TAB_SCROLL.wheelStep;
    this.moveTo(clampTabStart(Math.round(this.goal) + steps), true);
  }

  private startDrag(pointer: Phaser.Input.Pointer): void {
    // Agarrar la barra en movimiento la frena donde está.
    this.moveTo(this.position, false);
    this.drag = {
      pointerId: pointer.id,
      startX: pointer.x,
      startPosition: this.goal,
      dragging: false,
      samples: [{ x: pointer.x, time: performance.now() }],
    };
  }

  private moveDrag(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag || pointer.id !== drag.pointerId || !pointer.isDown) return;
    if (!drag.dragging) {
      if (Math.abs(pointer.x - drag.startX) < TAB_SCROLL.dragThreshold) return;
      // Desde acá la barra sigue al dedo; arranca en este punto para no dar un salto.
      drag.dragging = true;
      drag.startX = pointer.x;
    }
    const now = performance.now();
    drag.samples.push({ x: pointer.x, time: now });
    while (drag.samples.length > 1 && now - drag.samples[0].time > TAB_SCROLL.velocityWindowMs) drag.samples.shift();
    // Hacia la izquierda, el dedo trae los pisos de más arriba.
    this.goal = dragTabPosition(drag.startPosition - (pointer.x - drag.startX) / TAB_PITCH);
    this.strip.x = STRIP_LEFT - this.goal * TAB_PITCH;
  }

  private endDrag(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (!drag || pointer.id !== drag.pointerId) return;
    this.drag = null;
    if (!drag.dragging) {
      // Fue un toque: elige la pestaña y acomoda la barra, por si se la frenó a mitad de camino.
      const floor = this.floorAt(pointer.x);
      this.moveTo(clampTabStart(Math.round(this.position)), true);
      if (floor !== null) this.options.onSelect(floor);
      return;
    }
    this.moveTo(settleTabPosition(this.position, this.releaseVelocity(drag, pointer.x)), true);
  }

  /** Velocidad del dedo al soltar, en pestañas por ms (positiva hacia los pisos de arriba). */
  private releaseVelocity(drag: Drag, x: number): number {
    const now = performance.now();
    // Si el dedo se quedó quieto antes de soltar, no hay impulso.
    const recent = drag.samples.find((sample) => now - sample.time <= TAB_SCROLL.velocityWindowMs);
    if (!recent) return 0;
    // Al menos un frame: un último movimiento justo antes de soltar no da un impulso desmedido.
    return -(x - recent.x) / TAB_PITCH / Math.max(now - recent.time, 16);
  }

  /** Piso de la pestaña que está bajo `x`, o null si cae en el hueco entre dos. */
  private floorAt(x: number): number | null {
    const offset = x - STRIP_LEFT + this.position * TAB_PITCH;
    const floor = Math.floor(offset / TAB_PITCH);
    if (floor < 0 || floor >= this.tabs.length || offset - floor * TAB_PITCH > TAB_WIDTH) return null;
    return floor;
  }
}
