# Fusionitos — Documento de diseño

> **Fuente de verdad del proyecto.** Cualquier cambio de reglas, fórmulas o constantes se refleja acá en el mismo commit.
> "Fusionitos" es un título provisorio (se cambia en `src/config/strings.ts`).

## 1. Visión

Juego web *merge idle* de un solo jugador, inspirado en el género de Cow Evolution / Evolution Galaxy, con una temática propia.
Caen huevos, nacen criaturas, y al juntar dos iguales evolucionan a la siguiente. Cada criatura genera monedas sola.
El objetivo es descubrir las 30 criaturas, subiendo de piso en piso.

- **Plataforma:** navegador, en escritorio y celular. Se juega con mouse o con el dedo.
- **Stack:** Phaser 3 (3.90) + TypeScript + Vite. Tests con Vitest. Sin backend: el progreso se guarda en `localStorage`.
- **Pantalla:** vertical, con una resolución lógica de 1080×1920 escalada con `FIT`. En escritorio se ve como una columna centrada.
- **Publicado en:** https://felipearanguren.github.io/fusionitos/ (GitHub Pages; se actualiza solo con cada push a `master`).

## 2. Conceptos

| Término | Definición |
|---|---|
| **Piso** | Un mundo con su propio campo, color de fondo y 6 criaturas. Hay 5 pisos (índice interno 0–4; se muestran como "Piso 1–5"). |
| **Nivel global `n`** | Identifica a cada criatura de 1 a 30, contando todos los pisos. |
| **Tier** | Posición de la criatura dentro de su piso (1–6). `piso = ⌊(n−1)/6⌋`, `tier = (n−1) mod 6 + 1`. |
| **Campo** | El área donde caen los huevos y deambulan las criaturas de un piso. |
| **Capacidad** | Máximo de entidades (criaturas + huevos) en un piso: **12**. |
| **Entidad** | Una criatura o un huevo dentro de un campo. |

**Regla clave:** fusionar dos criaturas de nivel `n` da la de nivel `n+1`.
Por eso dos criaturas de tier 6 dan automáticamente el tier 1 del piso siguiente (6+6 → 7, 12+12 → 13, etc.).

## 3. Pisos y criaturas

Todo el catálogo vive en `src/config/creatures.ts`. Cada criatura es `{ name, emoji, image? }`: si se define `image` (un PNG en `public/assets/creatures/`), el juego usa la imagen en lugar del emoji. El resto del código solo conoce la textura `creature-{n}`, así que no hay que tocar nada más.

| Piso | Fondo | Decoración | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|---|
| 1 Jardín | verde claro | 🌼 🌱 🍀 | 🐛 Oruga | 🐌 Caracol | 🐜 Hormiga | 🐞 Vaquita | 🐝 Abeja | 🦋 Mariposa |
| 2 Granja | trigo | 🌾 🌻 | 🐣 Pollito | 🐓 Gallo | 🐇 Conejo | 🐖 Chancho | 🐑 Oveja | 🐄 Vaca |
| 3 Bosque | verde oscuro | 🌲 🍄 🍂 | 🦔 Erizo | 🐿️ Ardilla | 🦉 Búho | 🦡 Tejón | 🦌 Ciervo | 🐻 Oso |
| 4 Océano | azul | 🐚 🌿 | 🐠 Pez | 🦀 Cangrejo | 🐙 Pulpo | 🐬 Delfín | 🦈 Tiburón | 🐋 Ballena |
| 5 Galaxia | violeta | ⭐ ✨ 🌙 | 👾 Bichito cósmico | 👽 Alien | 🦄 Unicornio | 🐲 Dragoncito | 🐉 Dragón | 🌞 Sol viviente |

- Los emojis son de Unicode ≤ 11, para que se vean en Windows, Android e iOS.
- Los colores exactos (fondo y acento) están en `creatures.ts`.
- **Nivel máximo:** 30 (🌞 Sol viviente). Dos 🌞 no se fusionan.

## 4. Huevos — FASE 1

- Cada **5 s** cae un huevo 🥚 en un lugar al azar del campo del **piso 1**. Los pisos superiores nunca reciben huevos: se alimentan con merges y, en F3, con compras.
- En una partida nueva, el primer huevo cae a **1 s**, para que el campo no arranque vacío.
- **Dónde cae:** se sortean 12 posiciones candidatas y se elige la más alejada de las entidades existentes, para que no se amontonen.
- **Animación de caída:** el huevo cae desde arriba con rebote y su sombra crece al acercarse al suelo. En reposo se balancea, invitando a tocarlo.
- **Abrir:** al tocarlo o hacer clic, se sacude, se rompe con partículas y sale la criatura de **tier 1 de ese piso** (`n = piso×6 + 1`), en la misma posición.
- Los huevos **no se arrastran** y no generan monedas.
- **Campo lleno** (12 entidades contando huevos):
  - No caen huevos.
  - Se muestra el banner "¡Campo lleno!" y el contador de capacidad "12/12".
  - El temporizador queda **retenido** con el huevo "listo", y cae apenas se libera un lugar.

## 5. Merge — FASE 1

- **Deambular:** las criaturas se mueven lento por el campo, en pasos cortos con pausas y un pequeño rebote. Es solo visual; la posición se guarda al final de cada paso.
- **Arrastrar:** con mouse o dedo. Al levantar una criatura, se resaltan las iguales del campo.
- **Soltar:** el destino es la criatura más cercana al punto donde se suelta, dentro del radio de captura. Con eso:
  - Si el destino es **igual** (mismo nivel), se fusionan: las dos se juntan y desaparecen con una explosión de partículas y una onda, y en el lugar del destino aparece la de nivel `n+1` con un "pop".
  - Si el destino es **distinto**, es un **huevo** o no hay nada, la criatura **queda donde la soltaste**.
- **Merge entre pisos:** si `n+1` pertenece al piso siguiente (tier 6 + tier 6):
  - La nueva criatura aparece en el **piso de arriba**, en un lugar libre al azar, y **desbloquea** ese piso si estaba bloqueado.
  - Si ese piso está **lleno**, el merge se **rechaza**: la criatura queda donde la soltaste y se avisa "El Piso X está lleno".
  - Si el piso se desbloquea, aparece el aviso "¡Piso X desbloqueado!" y su pestaña late. La criatura nueva suma ingreso al instante, aunque no se esté viendo ese piso.
- **Nivel 30:** no se fusiona; se avisa "¡Nivel máximo!".
- **Monedas pendientes:** al fusionar, lo que las dos criaturas tenían acumulado para su próximo pulso se cobra en el momento, así que no se pierde nada.

## 6. Descubrimiento — FASE 1

- La **primera vez** que aparece una criatura (incluida la Oruga del primer huevo), se muestra el popup "¡Nueva criatura descubierta!" con la criatura en grande, su nombre, su piso y su ingreso por segundo.
- **Cola:** si se descubren varias seguidas, los popups se muestran en orden. Cada popup espera a que termine la animación que lo provocó.
- **Pisos desbloqueados:** se **derivan** de lo descubierto. El piso `f` está desbloqueado si ya se descubrió su tier 1; el piso 1 siempre lo está.
- **Máximo descubierto:** el nivel más alto en la lista de descubiertas. Se usa en la tienda de F3.

## 7. Economía

### 7.1 Ingreso pasivo — FASE 1

```
ingreso(n) = INCOME_BASE × INCOME_GROWTH^(n−1)  =  1 × 2.5^(n−1)  monedas/segundo
```

- **Fusionar siempre conviene:** dos criaturas de nivel `n` producen `2·ingreso(n)`, y la fusión produce `2.5·ingreso(n)`.
- **Ingreso total:** la suma de todas las criaturas de **todos** los pisos. Los huevos no cuentan.
- **Pulsos:** cada criatura acumula su producción y cada **3 s** la "suelta". Aparece un texto flotante "+X" sobre ella y el contador sube en ese momento. El promedio es exactamente `ingreso(n)` por segundo.
- **HUD:** arriba se ven las monedas (abreviadas) y el ingreso total "+X/s".
- **Pestaña oculta o juego cerrado:** en F1 no genera ingreso. En F3 se agrega el ingreso offline.

### 7.2 Abreviaturas

Se usa punto decimal y se **trunca** (nunca se muestra más de lo que hay).

- **Menos de 100 en su escala:** un decimal (`7.5`, `1.2K`, `56.3M`).
- **Desde 100:** sin decimales (`244`, `123K`).
- **Sufijos:** K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc. Más allá, notación científica (`1.00e36`).
- **Contador de monedas:** muestra la parte entera.

Ejemplos: 999 → `999` · 1000 → `1K` · 1234 → `1.2K` · 3 456 789 → `3.4M` · 5.6×10⁹ → `5.6B`.

### 7.3 Tienda — FASE 3

```
precio(n, k) = SHOP_BASE_PRICE × SHOP_PRICE_GROWTH^(n−1) × SHOP_PURCHASE_GROWTH^k
             = 15 × 3^(n−1) × 1.15^k        (k = compras previas de esa criatura)
```

- Solo se pueden comprar criaturas hasta **2 niveles por debajo** de la máxima descubierta (`n ≤ maxDescubierto − 2`).
- La criatura comprada aparece en el campo de **su** piso, en un lugar libre y con un "pop". Respeta la capacidad.
- **Repago** de la primera compra: `precio/ingreso = 15 × 1.2^(n−1)` segundos (de 15 s en n=1 a ~34 min en n=28, el máximo comprable).
- **Interfaz:** el botón **🛒 Tienda** del HUD abre la tienda **del piso que se ve**, con una fila por cada criatura de ese piso:
  - **sin descubrir:** silueta, "???" y 🔒 (no arruina la sorpresa);
  - **descubierta pero todavía no a la venta:** aparece apagada, con "🔒 Descubrí N más";
  - **a la venta:** nombre, ingreso por segundo y un botón con el precio. El botón se pone gris si no alcanzan las monedas o si el piso está lleno; en ese caso, la tienda avisa "¡Piso lleno! Fusioná para hacer lugar".
- La tienda queda abierta para comprar varias veces seguidas. Los precios y los botones se actualizan solos a medida que entran monedas.
- Las compras se guardan por nivel (`purchases`) y suben solo el precio de esa criatura.

### 7.4 Ingreso offline — FASE 3

```
offline = OFFLINE_INCOME_RATE × ingresoTotal × min(tiempoAusente, OFFLINE_MAX_HOURS)
        = 50 % del ingreso, con un máximo de 4 horas
```

- **Cuándo se calcula:**
  - **al abrir el juego:** por el tiempo desde `savedAt` del guardado;
  - **al volver a la pestaña:** por el tiempo que estuvo oculta. Con la pestaña oculta el juego está en pausa, y mientras tanto los guardados quedan fechados en el momento en que se ocultó; así, si después se cierra, la ausencia se cuenta entera.
- **Mínimo:** las ausencias de menos de **60 s** (`OFFLINE_MIN_SECONDS`) no cuentan; una recarga no da bienvenida. Sin criaturas tampoco hay nada que cobrar.
- **Popup "¡Hola de nuevo!":** muestra cuánto tiempo pasó ("Estuviste afuera 2 h 15 min."), cuánto juntaron las criaturas y la regla (50 %, hasta 4 h). Las monedas ya están sumadas cuando aparece.

### 7.5 Tabla de niveles

Generada con el código (`npm run design:tables`). Las columnas de F3 son referencia de balance.

| n | Piso · tier | Criatura | Ingreso/s | Pulso (cada 3 s) | Precio base F3 | Repago F3 |
|---:|---|---|---:|---:|---:|---:|
| 1 | 1 Jardín · 1 | 🐛 Oruga | 1 | +3 | 15 | 15 s |
| 2 | 1 Jardín · 2 | 🐌 Caracol | 2.5 | +7.5 | 45 | 18 s |
| 3 | 1 Jardín · 3 | 🐜 Hormiga | 6.2 | +18.7 | 135 | 22 s |
| 4 | 1 Jardín · 4 | 🐞 Vaquita | 15.6 | +46.8 | 405 | 26 s |
| 5 | 1 Jardín · 5 | 🐝 Abeja | 39 | +117 | 1.2K | 31 s |
| 6 | 1 Jardín · 6 | 🦋 Mariposa | 97.6 | +292 | 3.6K | 37 s |
| 7 | 2 Granja · 1 | 🐣 Pollito | 244 | +732 | 10.9K | 45 s |
| 8 | 2 Granja · 2 | 🐓 Gallo | 610 | +1.8K | 32.8K | 54 s |
| 9 | 2 Granja · 3 | 🐇 Conejo | 1.5K | +4.5K | 98.4K | 1.1 min |
| 10 | 2 Granja · 4 | 🐖 Chancho | 3.8K | +11.4K | 295K | 1.3 min |
| 11 | 2 Granja · 5 | 🐑 Oveja | 9.5K | +28.6K | 885K | 1.5 min |
| 12 | 2 Granja · 6 | 🐄 Vaca | 23.8K | +71.5K | 2.6M | 1.9 min |
| 13 | 3 Bosque · 1 | 🦔 Erizo | 59.6K | +178K | 7.9M | 2.2 min |
| 14 | 3 Bosque · 2 | 🐿️ Ardilla | 149K | +447K | 23.9M | 2.7 min |
| 15 | 3 Bosque · 3 | 🦉 Búho | 372K | +1.1M | 71.7M | 3.2 min |
| 16 | 3 Bosque · 4 | 🦡 Tejón | 931K | +2.7M | 215M | 3.9 min |
| 17 | 3 Bosque · 5 | 🦌 Ciervo | 2.3M | +6.9M | 645M | 4.6 min |
| 18 | 3 Bosque · 6 | 🐻 Oso | 5.8M | +17.4M | 1.9B | 5.5 min |
| 19 | 4 Océano · 1 | 🐠 Pez | 14.5M | +43.6M | 5.8B | 6.7 min |
| 20 | 4 Océano · 2 | 🦀 Cangrejo | 36.3M | +109M | 17.4B | 8.0 min |
| 21 | 4 Océano · 3 | 🐙 Pulpo | 90.9M | +272M | 52.3B | 9.6 min |
| 22 | 4 Océano · 4 | 🐬 Delfín | 227M | +682M | 156B | 11.5 min |
| 23 | 4 Océano · 5 | 🦈 Tiburón | 568M | +1.7B | 470B | 13.8 min |
| 24 | 4 Océano · 6 | 🐋 Ballena | 1.4B | +4.2B | 1.4T | 16.6 min |
| 25 | 5 Galaxia · 1 | 👾 Bichito cósmico | 3.5B | +10.6B | 4.2T | 19.9 min |
| 26 | 5 Galaxia · 2 | 👽 Alien | 8.8B | +26.6B | 12.7T | 23.8 min |
| 27 | 5 Galaxia · 3 | 🦄 Unicornio | 22.2B | +66.6B | 38.1T | 28.6 min |
| 28 | 5 Galaxia · 4 | 🐲 Dragoncito | 55.5B | +166B | 114T | 34.3 min |
| 29 | 5 Galaxia · 5 | 🐉 Dragón | 138B | +416B | 343T | 41.2 min |
| 30 | 5 Galaxia · 6 | 🌞 Sol viviente | 346B | +1T | 1Qa | 49.5 min |

## 8. Pisos — FASE 2

- **Pestañas:** una por piso, al pie de la pantalla.
  - **Desbloqueada:** muestra la primera criatura del piso, su nombre y la ocupación ("7/12", en rojo si está lleno).
  - **La del piso que se ve:** queda levantada y con borde blanco.
  - **Bloqueada:** muestra 🔒 y "Piso N". Tocarla no cambia de piso: avisa qué hace falta ("Para abrir el Piso 3: fusioná Vaca + Vaca").
- **Otras formas de cambiar:** en escritorio, las flechas ← y → del teclado van al piso desbloqueado anterior o siguiente.
- **Cambio de piso:** el campo hace un fundido y se redibuja con el color, la decoración y las criaturas de ese piso. La página toma el color del piso.
- **Campos independientes:** cada piso tiene su propio campo y su capacidad de 12. Las criaturas de cada piso se fusionan ahí; dos tier 6 suben al piso siguiente.
- **Huevos:** caen solo en el piso 1, también mientras se mira otro piso. En los demás pisos, la fila del huevo del HUD se reemplaza por "Recibe criaturas de los merges del Piso N".
- **Ingreso:** todos los pisos generan ingreso aunque no se estén viendo; los "+X" se ven solo en el piso que está en pantalla.
- **Avisos:** cuando llega una criatura a un piso que no se está viendo, su pestaña late.
- **Al recargar** se vuelve al piso 1. El piso que se mira es estado de la vista, no se guarda.
- **Al reiniciar** se vuelve al piso 1 y los demás se bloquean.

## 9. Interfaz — FASES 1 a 3

- **Barra superior:**
  - monedas con un ícono de moneda y el ingreso total "+X/s";
  - el nombre del piso que se ve y el botón **🛒 Tienda**;
  - en el piso 1, la barra del próximo huevo; en los demás, de dónde llegan sus criaturas;
  - la capacidad del piso que se ve ("7/12").
- **Campo:** fondo del color del piso con decoración tenue.
- **Banner** "¡Campo lleno!" mientras no quede lugar en el piso que se ve.
- **Popups:** "¡Nueva criatura descubierta!", la tienda, la bienvenida tras una ausencia y la confirmación de reinicio. Se muestran de a uno y, mientras están abiertos, bloquean el campo, las pestañas y el teclado.
- **Toasts:** avisos cortos ("¡Piso 2 desbloqueado!", "El Piso 2 está lleno", "¡Nivel máximo!", qué abre un piso bloqueado).
- **Pie:** las pestañas de pisos y, debajo, una pista de cómo jugar, los botones redondos 🔊 (efectos) y 🎵 (música) y el botón **Reiniciar** (abajo, para no tocarlo sin querer).

## 10. Guardado — FASE 1

- Se guarda en `localStorage`, en la clave `fusionitos.save`, como JSON versionado: `{ version, savedAt, state }`.
- **Cuándo se guarda:** autoguardado cada **10 s**, y también al ocultar la pestaña (`visibilitychange`), al cerrarla (`pagehide` / `beforeunload`) y justo después de reiniciar.
- **Qué se guarda (versión 2):**
  - las monedas y el progreso del próximo huevo;
  - las entidades de cada piso, con posición **normalizada** (0..1 dentro del campo) y el progreso de su pulso;
  - las criaturas descubiertas, el próximo id y las compras por nivel (`purchases`, desde v2);
  - `savedAt`: el último momento en que el juego corrió (base del ingreso offline).
- **Validación al cargar:**
  - Los valores fuera de rango se corrigen y las entidades inválidas se descartan.
  - Si el JSON está corrupto o la versión es desconocida, se copia a `fusionitos.save.corrupt` y el juego arranca de cero, sin romperse.
- **Migraciones:** si cambia el formato, se sube `SAVE_VERSION` y se agrega una migración. v1 → v2 agrega las compras vacías; un guardado de F1/F2 carga sin perder nada.
- **Si `localStorage` falla** (modo privado, cuota llena), el juego sigue funcionando sin guardar.
- **Reiniciar:** botón con un popup de confirmación. Borra todo y empieza de cero.

## 11. Constantes de balance

Única fuente: `src/config/balance.ts`. Esta tabla es su espejo.

| Constante | Valor | Uso |
|---|---|---|
| `CREATURES_PER_FLOOR` | 6 | Criaturas por piso. |
| `FLOOR_CAPACITY` | 12 | Máximo de criaturas + huevos por piso. |
| `EGG_INTERVAL_MS` | 5000 | Cada cuánto cae un huevo. |
| `FIRST_EGG_DELAY_MS` | 1000 | Espera hasta el primer huevo de una partida nueva. |
| `EGG_FLOOR` | 0 | Piso donde caen los huevos (el 1). |
| `SPAWN_CANDIDATES` | 12 | Posiciones sorteadas para elegir dónde cae un huevo. |
| `INCOME_BASE` | 1 | Ingreso del nivel 1 (monedas/s). |
| `INCOME_GROWTH` | 2.5 | Factor de ingreso por nivel. |
| `COIN_POP_INTERVAL_MS` | 3000 | Cada cuánto suelta monedas una criatura. |
| `MAX_TICK_MS` | 1000 | Tope de tiempo simulado por frame (evita saltos). |
| `AUTOSAVE_INTERVAL_MS` | 10000 | Autoguardado. |
| `SHOP_BASE_PRICE` | 15 | Tienda · precio del nivel 1. |
| `SHOP_PRICE_GROWTH` | 3 | Tienda · factor de precio por nivel. |
| `SHOP_PURCHASE_GROWTH` | 1.15 | Tienda · encarecimiento por compra. |
| `SHOP_LEVELS_BELOW_MAX` | 2 | Tienda · distancia mínima a la máxima descubierta. |
| `OFFLINE_INCOME_RATE` | 0.5 | Offline · fracción del ingreso. |
| `OFFLINE_MAX_HOURS` | 4 | Offline · tope de la ausencia que cuenta. |
| `OFFLINE_MIN_SECONDS` | 60 | Offline · ausencia mínima para que cuente. |

Las constantes visuales (tamaños, velocidades de deambular, duraciones de animación) están en `src/config/visuals.ts`, y los textos en `src/config/strings.ts`.

## 12. Fases

### FASE 1 — proyecto base + piso 1 completo ✅
- [x] Proyecto base: Phaser 3 + TypeScript + Vite + Vitest.
- [x] Huevos cada 5 s con animación de caída, en el piso 1.
- [x] Abrir huevos con animación.
- [x] Límite de 12 por piso, con aviso de campo lleno.
- [x] Criaturas que deambulan; drag & drop con mouse y dedo.
- [x] Merge con animación y partículas, incluido el merge entre pisos (con aviso de desbloqueo).
- [x] Ingreso pasivo con pulsos "+X" y contador abreviado.
- [x] Popup de nueva criatura descubierta.
- [x] Guardado automático, al cerrar, y reinicio con confirmación.
- [x] Tests unitarios de merge y economía.

### FASE 2 — pisos ✅
- [x] Pestañas (y flechas del teclado) para cambiar de piso; pisos bloqueados con candado y aviso de qué los abre.
- [x] Vista del campo propio de cada piso (colores y decoración), con su capacidad en el HUD y en la pestaña.

### FASE 3 — tienda y offline ✅
- [x] Tienda por piso con precio creciente, restricción de nivel y avisos de qué falta.
- [x] Ingreso offline (al abrir el juego y al volver a la pestaña) con popup de bienvenida.
- [x] Guardado v2 con migración desde v1.

### Extra — sonido y música ✅
- [x] Efectos sintetizados para cada acción y música de fondo en loop.
- [x] Botones para silenciar efectos y música, con la preferencia guardada.

### Ideas futuras (sin fase asignada)
Arte definitivo para las 30 criaturas, más pisos, logros, tutorial guiado y PWA instalable.

## 13. Sonido y música

Todo se sintetiza en el navegador con Web Audio: no hay archivos de audio ni licencias de por medio. Los efectos están en `src/config/sounds.ts` (cada uno es una lista de capas: tonos que pueden deslizarse, arpegios y ruido filtrado) y la música en `src/config/music.ts`.

| Momento | Sonido |
|---|---|
| Cae un huevo (al primer rebote) | golpe suave (`eggLand`) |
| Se toca un huevo / sale la criatura | crack (`eggCrack`) / "pop" (`hatchPop`) |
| Se levanta una criatura / se suelta sin fusionar | `pickUp` / `drop` |
| Fusión en el mismo piso | arpegio (`merge`), 2 semitonos más agudo por cada tier |
| Fusión que sube de piso | fanfarria (`levelUp`) |
| Pulso de monedas | tintineo bajito y redondo (`coin`), con variación de tono y un mínimo de 220 ms entre dos |
| Compra en la tienda | `purchase` (también aparece la criatura: `hatchPop`) |
| Algo que no se puede (botón gris, piso bloqueado, merge rechazado) | `denied` |
| Popup de criatura nueva / bienvenida | `discover` / `welcome` (cascada de monedas) |
| Cambio de piso | `whoosh` |
| Botones | `click` |

- **Música:** loop original de 16 compases (I–vi–IV–V en Do mayor, 100 BPM, unos 38 s), con melodía, arpegio, bajo (octava 3), un shaker suave y eco sobre la melodía. No tiene bombo. Va bajita: acompaña sin tapar.
- **Controles:** 🔊 apaga y prende los efectos y 🎵 la música (con fundido). Apagados se ven tachados.
- **Preferencia:** se guarda aparte de la partida (`fusionitos.audio`), así que reiniciar el juego no la cambia.
- **Reglas del navegador:** el audio arranca con el primer toque o tecla del jugador; antes, todo queda en silencio sin fallar.
- **Pestaña oculta:** el audio se pausa, igual que el juego.
- **Mezcla general:** `AUDIO_MIX` en `sounds.ts`.
- **Cuidado de los parlantes:** toda la salida pasa por un corte de graves (por debajo de 120 Hz) y un limitador de seguridad.
  - Los parlantes de celular y notebook no reproducen graves profundos: con un bombo de 45 Hz se saturaban y hacían un "tic" de chasquido. Por eso no hay bombo y ningún sonido baja de unos 130 Hz.
  - Ataques de al menos 8 ms, para que nada empiece con un clic seco.
  - Las notas nunca se programan en el pasado: si el juego se traba, se saltean.
