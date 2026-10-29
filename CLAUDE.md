# CLAUDE.md — Fusionitos

Juego web *merge idle* de un jugador, para escritorio y celular. Usa Phaser 3.90 + TypeScript + Vite, sin backend; el guardado va en `localStorage`.

## Antes de cada cambio

1. **Leé `GAME_DESIGN.md`.** Es la fuente de verdad: reglas, fórmulas, catálogo de criaturas, constantes y fases.
2. Si el cambio altera reglas, fórmulas, constantes o el catálogo, **actualizá `GAME_DESIGN.md` en el mismo commit**. Si cambia el balance o el catálogo:
   - regenerá la tabla de niveles con `npm run design:tables` y pegala en la sección 7.5;
   - corré `npm run simulate` y actualizá la sección 7.6. El objetivo es que la partida completa dure unas **4 horas**.
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
| `npm run simulate` | Juega una partida entera con un jugador automático (en ~1 s) e imprime cuándo se abre cada piso y cuánto dura todo. Opciones: `-- --seed N`, `--aps N` (acciones por segundo), `--window N` (niveles que mira al comprar). |

Antes de dar algo por terminado: `npm test` y `npm run build` sin errores.

## Publicación

- Cada push a `master` corre `.github/workflows/deploy.yml`: `npm ci`, `npm test` y `npm run build`, y publica `dist/` en GitHub Pages: https://felipearanguren.github.io/fusionitos/ (repo `FelipeAranguren/fusionitos`).
- Si los tests fallan, no se publica.
- Pages sirve el juego en una subcarpeta (`/fusionitos/`): por eso el build usa rutas relativas (`base: './'` en `vite.config.ts`). No lo cambies.
- Pushear publica. Hacelo solo cuando se pida.

## Arquitectura

```
src/config/   datos y constantes, sin lógica
  balance.ts    ÚNICA fuente de constantes de balance (huevos, ingreso, capacidad, tienda, offline)
  creatures.ts  catálogo de pisos y criaturas (nombre, emoji, imagen opcional, colores)
  visuals.ts    layout, tamaños, velocidades y duraciones de animación
  strings.ts    todos los textos de la UI (en español)
  sounds.ts     recetas de los efectos de sonido y mezcla general (AUDIO_MIX)
  music.ts      partitura del loop de música
src/audio/    sonido con Web Audio, sin Phaser: AudioEngine (efectos y música, silencio, pausa);
              notation.ts y settings.ts son puros y tienen tests
src/core/     lógica pura del juego: SIN Phaser, SIN DOM; testeada con Vitest
  GameModel.ts  fachada: estado + comandos (tick, hatch, merge, move, reset) + eventos
src/scenes/   escenas Phaser: BootScene (texturas), GameScene (campo de un piso), UIScene (HUD, pestañas y popups)
  context.ts    GameContext: modelo, bus de UI (`ui`: toast, selectFloor) y estado de la vista (`view.floor`, `view.welcome`)
src/view/     objetos visuales (CreatureView, EggView), efectos y widgets de UI (Button, Modal, FloorTab, ShopPopup…)
src/main.ts   arma GameModel + SaveManager + Phaser.Game y conecta el guardado
```

### Reglas de capas
- `src/core` **no importa Phaser ni toca el DOM** (lo verifica `src/core/architecture.test.ts`). Lo que necesita del entorno se inyecta: RNG, storage y reloj.
- Las vistas **nunca mutan el estado**: llaman a comandos del `GameModel` y reaccionan a sus eventos (`eggSpawned`, `eggHatched`, `creaturesMerged`, `coinsPopped`, `creatureDiscovered`, `floorUnlocked`, `stateReset`).
- Los valores continuos (monedas, ingreso/s, progreso del huevo, capacidad) el HUD los lee del modelo en `update()`. No se crean eventos para eso.
- La lógica aplica el cambio al instante; las animaciones son solo visuales y nunca bloquean al modelo.
- El modelo guarda las posiciones **normalizadas** (0..1 dentro del campo). La conversión a píxeles se hace solo en `src/view/fieldSpace.ts`.
- Las criaturas se dibujan por clave de textura. `BootScene` carga las `image` del catálogo y genera las texturas fijas (huevo, íconos, moneda). Las de criaturas y decoración se generan desde el emoji la primera vez que se usan: pedí la clave con `ensureCreatureTexture(scene, n)` o `ensureDecorTexture(scene, emoji)` (`src/view/textures.ts`), nunca armándola a mano.
- **Barra de pestañas:** 5 `FloorTab` fijas que muestran pisos según una ventana (`src/view/tabWindow.ts`, puro y testeado), más dos `TabArrow`. `UIScene` recalcula la ventana cuando cambia el piso que se ve o el de los huevos.
- **Piso que se ve:**
  - Es estado de la vista (`ctx.view.floor`), no del juego, así que no se guarda.
  - Para cambiarlo, se emite `ui.emit('selectFloor', { floor })`. `GameScene` valida que esté desbloqueado y se reinicia con `scene.restart({ floor })`.
  - Las escenas leen `view.floor` en `update()`.

### Configuración centralizada
- Ningún número de balance fuera de `balance.ts`, ningún texto de UI fuera de `strings.ts`, ningún emoji de criatura fuera de `creatures.ts` y ningún sonido fuera de `sounds.ts` y `music.ts`.
- Las escenas tocan sonidos con `ctx.audio.play('nombre')`. Un sonido nuevo se agrega como receta en `sounds.ts`, y el tipo `SoundName` lo valida.
- **Nada por debajo de ~130 Hz:** sin bombos ni subgraves, porque saturan los parlantes chicos. Igual la salida los corta a 120 Hz (`src/audio/mix.ts`).
- **No bajes el umbral del limitador:** el compresor de Web Audio sube el volumen general en proporción a lo que comprime.
- Para medir picos y graves sin escuchar, renderizá con `OfflineAudioContext` usando `createMix` y `MusicPlayer.scheduleStep`.
- El audio solo arranca después de un gesto del usuario (`main.ts` llama a `audio.unlock()`): no intentes reproducir antes ni lo trates como error.
- Para cambiar un emoji por una imagen: poné el archivo en `public/assets/creatures/` y completá `image` en `creatures.ts`. Nada más.

## Convenciones de código

- **Idioma:** identificadores en inglés; comentarios, docs, textos de UI y mensajes de commit en español.
- **TypeScript estricto:** sin `any` ni `@ts-ignore`. Usá `import type` para los tipos (`verbatimModuleSyntax`).
- **Sin enums, namespaces ni parameter properties** (`erasableSyntaxOnly`): usá uniones de literales u objetos `as const`.
- **Imports relativos con extensión `.ts`** (`import { x } from './levels.ts'`). Así los scripts de `scripts/` corren directo con Node.
- Nombres: `PascalCase` para clases y tipos, `camelCase` para funciones y variables, `UPPER_SNAKE_CASE` para constantes de config.
- **Clases que extienden objetos de Phaser:** no declares campos con nombres que Phaser ya usa (`body`, `count`, `state`, `data`, `scene`, `type`, `name`, `input`…). Con `useDefineForClassFields` los pisás y Phaser se rompe sin avisar. Al reiniciar una escena, la instancia se reutiliza: reseteá sus campos en `init()`.
- Comentarios cortos que expliquen el *porqué*, no el *qué*.

## Tests

- Toda lógica nueva o modificada en `src/core` lleva su test al lado (`algo.test.ts`), con Vitest en entorno Node.
- El azar se inyecta (`Rng`). En los tests se usa `mulberry32(semilla)` para que sean deterministas.
- No hay tests de las escenas Phaser. Se verifican a mano o con Playwright (ver abajo). La lógica de vista que no necesita Phaser va en un módulo aparte con su test (como `src/view/tabWindow.ts`).

## Guardado

- Clave `fusionitos.save`, con formato `{ version, savedAt, state }`. La versión actual es la **2** (v1 → v2 agregó `purchases`).
- `savedAt` es el último momento en que el juego corrió: con la pestaña oculta, `main.ts` fecha los guardados en el momento en que se ocultó. El ingreso offline depende de eso.
- **Si cambia la forma de `GameState`:**
  1. subí `SAVE_VERSION` en `src/core/save.ts`;
  2. agregá la migración desde la versión anterior;
  3. agregá un test con un guardado viejo.
- Nunca rompas la carga de un guardado existente sin migración.

## Verificación en el navegador

- En desarrollo existe `window.__debug` (no se incluye en el build), con:
  - `model` y `game`;
  - `spawnEgg()` (en el piso de los huevos) y `spawnCreature(level)` (aparece en el piso de su nivel y lo desbloquea; para simular una partida avanzada, creá el tier 1 de cada piso en orden);
  - `addCoins(n)` y `simulateAway(ms)` (ingreso offline y bienvenida, como al volver a la pestaña);
  - `audio()`: estado del audio (`locked` hasta el primer gesto), música y efectos prendidos, y los últimos sonidos que sonaron;
  - `selectFloor(floor)` y `currentFloor()` (pisos desde 0);
  - `entities()` (las del piso que se ve), con posiciones en píxeles de la página;
  - `buttons()`: los botones visibles, con posiciones en píxeles de la página. Se llaman `shop`, `shop:close`, `buy:N`, `reset`, `tab:N` (solo las 5 pestañas a la vista), `tabs:prev`, `tabs:next`, `eggs:go` (el atajo al piso de los huevos), `toggle:sfx`, `toggle:music`; los de los popups, por su texto;
  - `toPage(x, y)` y `clearSave()`.
- Con el MCP de Playwright (`.mcp.json`): `npm run dev` y abrir http://localhost:5173.
  - Para arrastrar sobre el canvas, usá `page.mouse` (down / move con pasos / up) con las coordenadas de `__debug.entities()`.
  - Las pruebas automáticas corren en un navegador headless aparte. El usuario suele jugar en la ventana visible de Playwright: no le cambies el viewport (`browser_resize` lo fija y rompe el ajuste y el zoom).
  - Las capturas van fuera del repo (`.playwright-mcp/` está en `.gitignore`).
