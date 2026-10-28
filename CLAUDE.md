# CLAUDE.md — Fusionitos

Juego web *merge idle* de un jugador, para escritorio y celular. Usa Phaser 3.90 + TypeScript + Vite, sin backend; el guardado va en `localStorage`.

## Antes de cada cambio

1. **Leé `GAME_DESIGN.md`.** Es la fuente de verdad: reglas, fórmulas, catálogo de criaturas, constantes y fases.
2. Si el cambio altera reglas, fórmulas, constantes o el catálogo, **actualizá `GAME_DESIGN.md` en el mismo commit**. Si cambia el balance o el catálogo, regenerá la tabla de niveles con `npm run design:tables` y pegala en la sección 7.5.
3. Implementá solo la fase que se pidió. Lo marcado como FASE 2 o FASE 3 no se hace hasta que se pida explícitamente.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173. Agregá `-- --host` para probar desde el celular en la misma red. |
| `npm run build` | `tsc` (chequeo de tipos) + build de producción en `dist/`. |
| `npm run preview` | Sirve el build. |
| `npm test` | Tests con Vitest (una pasada). `npm run test:watch` para el modo watch. |
| `npm run typecheck` | Solo chequeo de tipos. |
| `npm run design:tables` | Imprime la tabla de niveles de `GAME_DESIGN.md`, generada desde el código. |

Antes de dar algo por terminado: `npm test` y `npm run build` sin errores.

## Arquitectura

```
src/config/   datos y constantes, sin lógica
  balance.ts    ÚNICA fuente de constantes de balance (huevos, ingreso, capacidad, tienda, offline)
  creatures.ts  catálogo de pisos y criaturas (nombre, emoji, imagen opcional, colores)
  visuals.ts    layout, tamaños, velocidades y duraciones de animación
  strings.ts    todos los textos de la UI (en español)
src/core/     lógica pura del juego: SIN Phaser, SIN DOM; testeada con Vitest
  GameModel.ts  fachada: estado + comandos (tick, hatch, merge, move, reset) + eventos
src/scenes/   escenas Phaser: BootScene (texturas), GameScene (campo), UIScene (HUD y popups)
src/view/     objetos visuales (CreatureView, EggView), efectos y widgets de UI
src/main.ts   arma GameModel + SaveManager + Phaser.Game y conecta el guardado
```

### Reglas de capas
- `src/core` **no importa Phaser ni toca el DOM** (lo verifica `src/core/architecture.test.ts`). Lo que necesita del entorno se inyecta: RNG, storage y reloj.
- Las vistas **nunca mutan el estado**: llaman a comandos del `GameModel` y reaccionan a sus eventos (`eggSpawned`, `eggHatched`, `creaturesMerged`, `coinsPopped`, `creatureDiscovered`, `floorUnlocked`, `stateReset`).
- Los valores continuos (monedas, ingreso/s, progreso del huevo, capacidad) el HUD los lee del modelo en `update()`. No se crean eventos para eso.
- La lógica aplica el cambio al instante; las animaciones son solo visuales y nunca bloquean al modelo.
- El modelo guarda las posiciones **normalizadas** (0..1 dentro del campo). La conversión a píxeles se hace solo en `src/view/fieldSpace.ts`.
- Las criaturas se dibujan por clave de textura (`creature-{n}`). `BootScene` genera esas texturas desde el emoji o carga `image` si está definida.

### Configuración centralizada
- Ningún número de balance fuera de `balance.ts`, ningún texto de UI fuera de `strings.ts` y ningún emoji de criatura fuera de `creatures.ts`.
- Para cambiar un emoji por una imagen: poné el archivo en `public/assets/creatures/` y completá `image` en `creatures.ts`. Nada más.

## Convenciones de código

- **Idioma:** identificadores en inglés; comentarios, docs, textos de UI y mensajes de commit en español.
- **TypeScript estricto:** sin `any` ni `@ts-ignore`. Usá `import type` para los tipos (`verbatimModuleSyntax`).
- **Sin enums, namespaces ni parameter properties** (`erasableSyntaxOnly`): usá uniones de literales u objetos `as const`.
- **Imports relativos con extensión `.ts`** (`import { x } from './levels.ts'`). Así los scripts de `scripts/` corren directo con Node.
- Nombres: `PascalCase` para clases y tipos, `camelCase` para funciones y variables, `UPPER_SNAKE_CASE` para constantes de config.
- Comentarios cortos que expliquen el *porqué*, no el *qué*.

## Tests

- Toda lógica nueva o modificada en `src/core` lleva su test al lado (`algo.test.ts`), con Vitest en entorno Node.
- El azar se inyecta (`Rng`). En los tests se usa `mulberry32(semilla)` para que sean deterministas.
- No hay tests de las escenas Phaser. Se verifican a mano o con Playwright (ver abajo).

## Guardado

- Clave `fusionitos.save`, con formato `{ version, savedAt, state }`.
- **Si cambia la forma de `GameState`:**
  1. subí `SAVE_VERSION` en `src/core/save.ts`;
  2. agregá la migración desde la versión anterior;
  3. agregá un test con un guardado viejo.
- Nunca rompas la carga de un guardado existente sin migración.

## Verificación en el navegador

- En desarrollo existe `window.__debug` (no se incluye en el build), con:
  - `model` y `game`;
  - `spawnEgg()` y `spawnCreature(level)` (aparece en el piso de su nivel);
  - `entities()` y `buttons()`, con posiciones en píxeles de la página;
  - `toPage(x, y)` y `clearSave()`.
- Con el MCP de Playwright (`.mcp.json`): `npm run dev` y abrir http://localhost:5173.
  - Para arrastrar sobre el canvas, usá `page.mouse` (down / move con pasos / up) con las coordenadas de `__debug.entities()`.
  - Las capturas van fuera del repo (`.playwright-mcp/` está en `.gitignore`).
