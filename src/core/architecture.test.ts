import { describe, expect, it } from 'vitest';

// Código fuente del core (sin los tests), como texto.
const sources = import.meta.glob<string>(['./*.ts', '!./*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('arquitectura del core', () => {
  it('encuentra los módulos del core', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(8);
  });

  it.each(Object.entries(sources))('%s no depende de Phaser ni del DOM', (_path, source) => {
    expect(source).not.toMatch(/from\s+['"]phaser['"]|import\(\s*['"]phaser['"]\s*\)/);
    expect(source).not.toMatch(/\b(window|document|localStorage|sessionStorage)\./);
    expect(source).not.toMatch(/from\s+['"]\.\.\/(scenes|view)\//);
  });
});
