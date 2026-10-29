import { describe, expect, it } from 'vitest';
import { dragTabPosition, pageTabWindow, settleTabPosition, tabWindowStart } from './tabWindow.ts';

// 20 pisos, 5 pestañas a la vista; los pisos son índices (0 = Piso 1).
const start = (current: number, eggFloor: number) => tabWindowStart(current, eggFloor, 20, 5);

describe('ventana de pestañas', () => {
  it('al principio muestra los primeros pisos', () => {
    expect(start(0, 0)).toBe(0);
    expect(start(2, 0)).toBe(0);
  });

  it('centra el piso que se ve', () => {
    expect(start(6, 6)).toBe(4);
    expect(start(10, 8)).toBe(8);
  });

  it('en el piso más alto entran el de los huevos y el próximo a abrir', () => {
    // Piso 10 abierto: los huevos caen en el 8. Se ven del 8 al 12.
    expect(start(9, 7)).toBe(7);
  });

  it('si el piso de los huevos queda lejos, manda el piso que se ve', () => {
    expect(start(0, 6)).toBe(0);
    expect(start(15, 3)).toBe(13);
  });

  it('no se pasa de los extremos', () => {
    expect(start(19, 16)).toBe(15);
    expect(start(18, 18)).toBe(15);
  });

  it('el piso que se ve siempre queda a la vista', () => {
    for (let current = 0; current < 20; current++) {
      for (let eggFloor = 0; eggFloor < 20; eggFloor++) {
        const first = start(current, eggFloor);
        expect(current).toBeGreaterThanOrEqual(first);
        expect(current).toBeLessThan(first + 5);
        if (Math.abs(current - eggFloor) < 5) {
          expect(eggFloor).toBeGreaterThanOrEqual(first);
          expect(eggFloor).toBeLessThan(first + 5);
        }
      }
    }
  });

  it('las flechas corren una página sin pasarse', () => {
    expect(pageTabWindow(6, 1, 20, 5)).toBe(11);
    expect(pageTabWindow(11, 1, 20, 5)).toBe(15);
    expect(pageTabWindow(15, 1, 20, 5)).toBe(15);
    expect(pageTabWindow(2, -1, 20, 5)).toBe(0);
  });

  it('con menos pisos que pestañas no se mueve', () => {
    expect(tabWindowStart(2, 0, 3, 5)).toBe(0);
    expect(pageTabWindow(0, 1, 3, 5)).toBe(0);
    expect(settleTabPosition(0, 1, 3, 5, 250)).toBe(0);
  });
});

describe('barra deslizable', () => {
  const drag = (position: number) => dragTabPosition(position, 20, 5, 0.35);
  const settle = (position: number, velocity: number) => settleTabPosition(position, velocity, 20, 5, 250);

  it('al arrastrar sigue al dedo', () => {
    expect(drag(0)).toBe(0);
    expect(drag(7.4)).toBe(7.4);
    expect(drag(15)).toBe(15);
  });

  it('pasado un extremo se resiste', () => {
    expect(drag(-2)).toBeCloseTo(-0.7);
    expect(drag(17)).toBeCloseTo(15.7);
  });

  it('al soltar despacio se acomoda en la pestaña más cercana', () => {
    expect(settle(3.4, 0)).toBe(3);
    expect(settle(3.6, 0)).toBe(4);
  });

  it('al soltar con impulso sigue de largo', () => {
    // 0.01 pestañas/ms durante 250 ms: 2.5 pestañas más.
    expect(settle(3.2, 0.01)).toBe(6);
    expect(settle(3.2, -0.01)).toBe(1);
  });

  it('se acomoda dentro de los extremos', () => {
    expect(settle(14.8, 0.05)).toBe(15);
    expect(settle(-0.6, 0)).toBe(0);
    expect(settle(15.6, 0)).toBe(15);
  });
});
