# CLAUDE.md — Fusionitos

Juego web *merge idle* de un jugador, para escritorio y celular. Usa Phaser 3.90 + TypeScript + Vite. Para jugar hay que entrar con mail y contraseña: las cuentas y la partida en la nube van con Firebase (Authentication + Firestore Lite), y hay una copia de la partida en `localStorage`.

## Antes de cada cambio

1. **Leé `GAME_DESIGN.md`.** Es la fuente de verdad: reglas, fórmulas, catálogo de criaturas, constantes y fases.
2. Si el cambio altera reglas, fórmulas, constantes o el catálogo, **actualizá `GAME_DESIGN.md` en el mismo commit**. Si cambia el balance o el catálogo:
   - regenerá la tabla de niveles con `npm run design:tables` y pegala en la sección 7.5;
   - corré `npm run simulate` y actualizá la sección 7.6. El objetivo es que la partida completa dure unas **4 h 30 min**. Con los huevos 1 piso abajo bajó de 5 h 20 min, y se decidió no compensarlo con menos ingreso.
3. Implementá solo la fase que se pidió. Lo marcado como FASE 2 o FASE 3 no se hace hasta que se pida explícitamente.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173, con el proyecto **real** de Firebase: lo que se juega ahí queda en la cuenta de verdad. Agregá `-- --host` para probar desde el celular en la misma red. |
| `npm run emulators` | Emuladores de Firebase (Authentication en el puerto 9099 y Firestore en el 8080) con el proyecto `demo-fusionitos`, sin conexión ni datos reales. Necesita Java 11 o más en el `PATH`. Al cerrarlos se borra todo. |
| `npm run dev:emulators` | Servidor de desarrollo en http://localhost:5174 conectado a los emuladores. Para probar cuentas sin tocar las de verdad. |
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
- **Firebase** (proyecto `fusionitos`, consola en https://console.firebase.google.com, plan gratis):
  - Los datos del proyecto van en `src/config/cloud.ts`. No son secretos: viajan en el juego publicado.
  - Lo que protege las partidas son las reglas de `firestore.rules`. Si las cambiás, publicalas también en la consola (Firestore → Reglas): el repo no las sube solo.
  - En la consola tiene que estar habilitado Authentication → Correo electrónico/contraseña, y `felipearanguren.github.io` en los dominios autorizados.
  - Sin los datos del proyecto, el juego publicado no deja entrar: no publiques con `cloud.ts` vacío.

## Arquitectura

```
src/config/   datos y constantes, sin lógica
  balance.ts    ÚNICA fuente de constantes de balance (huevos, ingreso, capacidad, tienda, offline)
  creatures.ts  catálogo de pisos y criaturas (nombre, emoji, imagen opcional, colores)
  visuals.ts    layout, tamaños, velocidades y duraciones de animación
  strings.ts    todos los textos de la UI (en español)
  sounds.ts     recetas de los efectos de sonido y mezcla general (AUDIO_MIX)
  music.ts      partitura del loop de música
  cloud.ts      Firebase: datos del proyecto, emuladores y tiempos del guardado en la nube (CLOUD_SAVE)
src/account/  cuentas, sin Phaser:
  openAccount.ts   al arrancar: sesión (o pantalla de ingreso) y con qué partida se juega
  AccountScreen.ts pantalla de la cuenta en HTML (ingreso, esperas y avisos), encima del juego
  CloudSave.ts     la partida en Firestore (`saves/{uid}`) y quién la está usando
  firebase.ts      arma Firebase; con `--mode emulators`, contra los emuladores
              authErrors.ts, ownership.ts y cloudStatus.ts son puros y tienen tests
src/audio/    sonido con Web Audio, sin Phaser: AudioEngine (efectos y música, silencio, pausa);
              notation.ts y settings.ts son puros y tienen tests
src/install/  acceso directo, sin Phaser: InstallPrompt (aviso `beforeinstallprompt` del navegador);
              platform.ts (cuándo ofrecerlo y qué pasos explicar) es puro y tiene tests
src/core/     lógica pura del juego: SIN Phaser, SIN DOM, SIN Firebase; testeada con Vitest
  GameModel.ts  fachada: estado + comandos (tick, hatch, merge, move, reset) + eventos
  saveChoice.ts con qué partida arranca una cuenta (nube, copia local o la de antes de las cuentas)
src/scenes/   escenas Phaser: BootScene (texturas), GameScene (campo de un piso), UIScene (HUD, pestañas y popups)
  context.ts    GameContext: modelo, bus de UI (`ui`: toast, selectFloor, showClosing, closingShown) y estado de la vista (`view.floor`, `view.welcome`)
src/view/     objetos visuales (CreatureView, EggView), efectos y widgets de UI (Button, Modal, FloorTab, ShopPopup…)
src/main.ts   abre la cuenta y recién después arma GameModel + Phaser.Game; conecta el guardado (local y nube)
public/       manifest.webmanifest e icons/ (instalable como app): los PNG se renderizan desde
              icons/icon.svg con Chrome headless; el maskable lleva el dibujo al 80 %
firestore.rules  reglas de acceso a las partidas (cada cuenta, solo la suya)
firebase.json    puertos de los emuladores y las reglas que cargan
```

### Reglas de capas
- `src/core` **no importa Phaser ni Firebase ni toca el DOM** (lo verifica `src/core/architecture.test.ts`). Lo que necesita del entorno se inyecta: RNG, storage y reloj.
- **Cuentas:** el juego (modelo y Phaser) se crea recién cuando hay sesión y partida (`openAccount`). La pantalla de la cuenta es HTML porque Phaser no tiene campos de texto; mientras se juega queda oculta y se usa para los avisos que bloquean todo (otra apertura tomó la partida, guardando antes de cerrar sesión).
  - A la nube se sube el mismo texto que se guarda en `localStorage` (`serializeSave`), así las migraciones valen para los dos.
  - Cada apertura del juego tiene un `session` al azar que se guarda junto a la partida. Antes de subir, una transacción mira si sigue siendo la suya (`ownership.ts`); si no, esa apertura deja de guardar.
- Las vistas **nunca mutan el estado**: llaman a comandos del `GameModel` y reaccionan a sus eventos (`eggSpawned`, `eggHatched`, `creaturesMerged`, `creatureAdded`, `coinsPopped`, `creatureDiscovered`, `floorUnlocked`, `floorClosed`, `stateReset`).
- Los valores continuos (monedas, ingreso/s, progreso del huevo, capacidad) el HUD los lee del modelo en `update()`. No se crean eventos para eso.
- La lógica aplica el cambio al instante; las animaciones son solo visuales y nunca bloquean al modelo.
- El modelo guarda las posiciones **normalizadas** (0..1 dentro del campo). La conversión a píxeles se hace solo en `src/view/fieldSpace.ts`.
- Las criaturas se dibujan por clave de textura. `BootScene` carga las `image` del catálogo y genera las texturas fijas (huevo, íconos, moneda). Las de criaturas y decoración se generan desde el emoji la primera vez que se usan: pedí la clave con `ensureCreatureTexture(scene, n)` o `ensureDecorTexture(scene, emoji)` (`src/view/textures.ts`), nunca armándola a mano.
- **Texturas dibujadas por código:** pasan por `addGeneratedTexture`, que en WebGL las registra como píxeles (`addUint8Array`) y no como canvas. Con la pestaña en segundo plano, el celular puede perder la GPU y con ella el contenido de los canvas: los emojis desaparecían. Al recuperar el contexto, Phaser vuelve a subir cada textura desde sus píxeles.
- **Rendimiento — nada de curvas con `Graphics` en lo que se ve siempre:** Phaser vuelve a triangular en cada frame los rectángulos redondeados y círculos de un `Graphics` (~100 puntos por esquina). Con varios en pantalla, el juego iba a ~11 cuadros por segundo en el celular. Usá `roundedRect` / `RoundedFrame` (`src/view/ui/shapes.ts`) o `scene.add.circle`: calculan su contorno una sola vez. `Graphics` queda para rectángulos, triángulos y líneas, o para algo pasajero.
- **Barra de pestañas:** `TabStrip` (`src/view/ui/TabStrip.ts`) es una tira con una `FloorTab` por piso, recortada con una máscara entre dos `TabArrow`. Solo se dibujan las pestañas que asoman entre las flechas.
  - Los toques los atiende una zona que cubre la tira, no cada pestaña: así se distingue tocar una pestaña de deslizar la barra (arrastre con impulso, rueda del mouse).
  - Dónde se acomoda lo decide `src/view/tabWindow.ts` (puro y testeado). `UIScene` la lleva a `tabWindowStart` cuando cambia el piso que se ve o el de los huevos.
- **Piso que se ve:**
  - Es estado de la vista (`ctx.view.floor`), no del juego, así que no se guarda. Al abrir el juego es el más alto desbloqueado (`main.ts`).
  - Para cambiarlo, se emite `ui.emit('selectFloor', { floor })`. `GameScene` valida que esté abierto (desbloqueado y no cerrado) y se reinicia con `scene.restart({ floor })`.
  - Las escenas leen `view.floor` en `update()`.
- **Pisos cerrados** (por debajo del de los huevos): es una regla derivada (`isFloorClosed`), no un dato guardado. El modelo los vacía al instante y emite `floorClosed` con lo que tenían.
  - `UIScene` encola el cierre detrás del popup de la criatura nueva (una sola cola de pasos) y, cuando le toca, emite `showClosing`.
  - `GameScene` se reinicia en ese piso con lo que tenía (`scene.restart({ floor, closing })`), baja la persiana y avisa con `closingShown`. Después la `UIScene` pasa al piso de los huevos.
  - Mientras tanto, la `UIScene` está ocupada (`busy`): no cambia de piso ni abre popups.

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

- Formato `{ version, savedAt, state }`. La versión actual es la **2** (v1 → v2 agregó `purchases`).
- Claves:
  - `fusionitos.save.account.<uid>`: la copia local de la partida de cada cuenta.
  - `fusionitos.save`: la partida de antes de las cuentas. Pasa a la primera cuenta que entra en ese dispositivo y se mueve a `fusionitos.save.device-backup` (`chooseStartingSave`, GAME_DESIGN §15).
  - En la nube, `saves/{uid}` en Firestore: `{ save, session }`, donde `save` es el mismo texto.
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
  - `install()`: si se ofrece el acceso directo y para qué sistema son los pasos;
  - `account()`: el mail, esta apertura (`session`) y cómo está la nube; `pushCloud()` sube ya (y así se entera si otra apertura tomó la partida);
  - `selectFloor(floor)` y `currentFloor()` (pisos desde 0);
  - `entities()` (las del piso que se ve), con posiciones en píxeles de la página;
  - `buttons()`: los botones visibles, con posiciones en píxeles de la página. Se llaman `shop`, `shop:close`, `buy:N`, `reset`, `tab:N` (solo las 5 pestañas a la vista), `tabs:prev`, `tabs:next`, `eggs:go` (el atajo al piso de los huevos), `toggle:sfx`, `toggle:music`, `install`, `account`; los de los popups, por su texto;
  - `toPage(x, y)` y `clearSave()` (borra la copia local de la cuenta; la de la nube queda).
- **Cuentas en las pruebas:** usá los emuladores (`npm run emulators` y `npm run dev:emulators`, puerto 5174), nunca el proyecto real. Para cada prueba, un contexto de navegador nuevo y una cuenta inventada (`algo@fusionitos.test`); el formulario es HTML (`input[name=email]`, `input[name=password]`, `.account-primary`).
  - Para ver la partida en la nube: `GET http://127.0.0.1:8080/v1/projects/demo-fusionitos/databases/(default)/documents/saves/<uid>` con `Authorization: Bearer owner`.
  - Los mails (recuperar la contraseña) no salen: el emulador los lista en `http://127.0.0.1:9099/emulator/v1/projects/demo-fusionitos/oobCodes`.
  - Para simular que la nube no responde: `context.route('http://127.0.0.1:8080/**', (r) => r.abort())`.
- Con el MCP de Playwright (`.mcp.json`): `npm run dev` y abrir http://localhost:5173.
  - Para arrastrar sobre el canvas, usá `page.mouse` (down / move con pasos / up) con las coordenadas de `__debug.entities()`.
  - Las pruebas automáticas corren en un navegador headless aparte. El usuario suele jugar en la ventana visible de Playwright: no le cambies el viewport (`browser_resize` lo fija y rompe el ajuste y el zoom).
  - Las capturas van fuera del repo (`.playwright-mcp/` está en `.gitignore`).
  - Para medir la fluidez como en un celular: en el Chrome headless, `Emulation.setCPUThrottlingRate({ rate: 4 })` por CDP, medir los cuadros con `requestAnimationFrame` mientras se arrastra una criatura, y ver dónde se va el tiempo con `Profiler.start` / `Profiler.stop`.
  - Para simular que el celular pierde la GPU: en el Chrome headless, `(await browser.newBrowserCDPSession()).send('Browser.crashGpuProcess')`. Con `WEBGL_lose_context` no alcanza, porque no borra los canvas.
