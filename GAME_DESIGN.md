# Fusionitos — Documento de diseño

> **Fuente de verdad del proyecto.** Cualquier cambio de reglas, fórmulas o constantes se refleja acá en el mismo commit.
> "Fusionitos" es un título provisorio (se cambia en `src/config/strings.ts`).

## 1. Visión

Juego web *merge idle* de un solo jugador, inspirado en el género de Cow Evolution / Evolution Galaxy, con una temática propia.
Caen huevos, nacen criaturas, y al juntar dos iguales evolucionan a la siguiente. Cada criatura genera monedas sola.
El objetivo es descubrir las 120 criaturas, subiendo de piso en piso por los 20 pisos. Terminar lleva unas 5 h 20 min de juego seguido (§7.6).

- **Plataforma:** navegador, en escritorio y celular. Se juega con mouse o con el dedo.
- **Stack:** Phaser 3 (3.90) + TypeScript + Vite. Tests con Vitest. Sin backend: el progreso se guarda en `localStorage`.
- **Pantalla:** vertical, con una resolución lógica de 1080×1920 escalada con `FIT`. En escritorio se ve como una columna centrada.
- **Publicado en:** https://felipearanguren.github.io/fusionitos/ (GitHub Pages; se actualiza solo con cada push a `master`).

## 2. Conceptos

| Término | Definición |
|---|---|
| **Piso** | Un mundo con su propio campo, color de fondo y 6 criaturas. Hay 20 pisos (índice interno 0–19; se muestran como "Piso 1–20"). |
| **Nivel global `n`** | Identifica a cada criatura de 1 a 120, contando todos los pisos. |
| **Tier** | Posición de la criatura dentro de su piso (1–6). `piso = ⌊(n−1)/6⌋`, `tier = (n−1) mod 6 + 1`. |
| **Campo** | El área donde caen los huevos y deambulan las criaturas de un piso. |
| **Capacidad** | Máximo de entidades (criaturas + huevos) en un piso: **12**. |
| **Entidad** | Una criatura o un huevo dentro de un campo. |
| **Piso de los huevos** | Donde caen los huevos: 2 pisos por debajo del piso más alto desbloqueado (como mínimo, el piso 1). Ver §4. |

**Regla clave:** fusionar dos criaturas de nivel `n` da la de nivel `n+1`.
Por eso dos criaturas de tier 6 dan automáticamente el tier 1 del piso siguiente (6+6 → 7, 12+12 → 13, etc.).

## 3. Pisos y criaturas

Todo el catálogo vive en `src/config/creatures.ts`. Cada criatura es `{ name, emoji, image? }`: si se define `image` (un PNG en `public/assets/creatures/`), el juego usa la imagen en lugar del emoji. El resto del código solo conoce la textura `creature-{n}`, así que no hay que tocar nada más.

| Piso | Fondo | Decoración | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|---|
| 1 Jardín | verde claro | 🌼 🌱 🍀 | 🐛 Oruga | 🐌 Caracol | 🐜 Hormiga | 🐞 Vaquita | 🐝 Abeja | 🦋 Mariposa |
| 2 Granja | trigo | 🌾 🌻 | 🐣 Pollito | 🐓 Gallo | 🐇 Conejo | 🐖 Chancho | 🐑 Oveja | 🐄 Vaca |
| 3 Bosque | verde | 🌲 🍄 🍂 | 🦔 Erizo | 🐿️ Ardilla | 🦉 Búho | 🦡 Tejón | 🦌 Ciervo | 🐻 Oso |
| 4 Océano | azul | ⚓ 🌿 | 🐠 Pez | 🦀 Cangrejo | 🐙 Pulpo | 🐬 Delfín | 🦈 Tiburón | 🐋 Ballena |
| 5 Pantano | verde musgo | 🍃 💧 | 🦟 Mosquito | 🐸 Rana | 🦎 Lagartija | 🐢 Tortuga | 🦛 Hipopótamo | 🐊 Cocodrilo |
| 6 Ciudad | gris | 🧱 🚲 | 🐀 Rata | 🐦 Gorrión | 🦝 Mapache | 🐈 Gato | 🐕 Perro | 🐩 Caniche |
| 7 Lago | turquesa | 🪨 💧 | 🐟 Trucha | 🦆 Pato | 🦦 Nutria | 🦫 Castor | 🦢 Cisne | 🦩 Flamenco |
| 8 Pradera | verde lima | 🌾 🌷 | 🐁 Ratón | 🐹 Hámster | 🦃 Pavo | 🐗 Jabalí | 🐃 Búfalo | 🐎 Mustang |
| 9 Desierto | arena | 🌵 🪨 | 🪲 Escarabajo | 🦂 Escorpión | 🐍 Serpiente | 🦊 Fénec | 🦘 Canguro | 🐫 Camello |
| 10 Sabana | ocre | 🌳 🍂 | 🦓 Cebra | 🦒 Jirafa | 🐆 Leopardo | 🦏 Rinoceronte | 🐘 Elefante | 🦁 León |
| 11 Selva | verde selva | 🌴 🌺 | 🦜 Loro | 🐒 Mono | 🦥 Perezoso | 🐅 Tigre | 🦧 Orangután | 🦍 Gorila |
| 12 Montaña | gris azulado | 🪨 🌲 ❄️ | 🐐 Cabra | 🐏 Carnero | 🦙 Llama | 🐂 Yak | 🦬 Bisonte | 🦅 Cóndor |
| 13 Polo | celeste hielo | ❄️ 🧊 | 🐧 Pingüino | 🦭 Foca | 🐺 Lobo ártico | 🐳 Orca | ☃️ Muñeco de nieve | 🦣 Mamut |
| 14 Noche | azul noche | ⭐ ✨ | 🦗 Grillo | 🕷️ Araña | 🦨 Zorrillo | 🦇 Murciélago | 🌚 Luna nueva | 🌝 Luna llena |
| 15 Prehistoria | tierra | 🦴 🪨 | 🪱 Lombriz | 🦐 Trilobite | 🐚 Amonite | 🦤 Dodo | 🦕 Saurópodo | 🦖 Tiranosaurio |
| 16 Abismo | azul profundo | 💎 🌿 | 🦪 Ostra | 🐡 Pez globo | 🦞 Langosta | 🦑 Calamar gigante | 🧜 Sirena | 🐉 Leviatán |
| 17 Mansión | violeta grisáceo | 🕸️ 🕯️ | 🎃 Calabaza | 👻 Fantasma | 💀 Calavera | 🧟 Zombi | 🧛 Vampiro | 🧙 Bruja |
| 18 Reino mágico | rosa | ✨ 🍄 🌈 | 🧚 Hada | 🧝 Elfo | 👹 Ogro | 🧞 Genio | 🦄 Unicornio | 🐲 Dragón |
| 19 Juguetería | amarillo | 🎈 🧩 | 🧸 Osito | 🐴 Caballito | 🪆 Matrioska | 🤡 Payaso | 👾 Pixelito | 🤖 Robot |
| 20 Galaxia | violeta | 💫 ✨ 🌙 | 👽 Alien | 🛸 Platillo volador | ☄️ Cometa | 🪐 Planeta viviente | 🌞 Sol viviente | 🌟 Supernova |

- Ninguna temática se repite y ningún emoji aparece dos veces (ni como criatura ni entre la decoración y las criaturas). Lo verifica `creatures.test.ts`.
- **Compatibilidad de emojis:** la mayoría es de Unicode ≤ 11. 🪱 🦤 🪲 🦫 🦬 🦣 🦭 🪆 y la 🪨 de decoración son de Emoji 13 (2020): se ven en Windows 11, Android 11+, iOS 14.2+ y macOS 11+. En Windows 10 pueden aparecer como un cuadrado; si molesta, se reemplazan con `image`.
- Los colores exactos (fondo, acento y página) están en `creatures.ts`. En los fondos oscuros (Noche, Abismo, Mansión, Galaxia) la decoración es más opaca (`decorAlpha`).
- **Texturas:** las de criaturas y decoración se generan la primera vez que se muestran, no todas al arrancar (son 120 a 256 px).
- **Nivel máximo:** 120 (🌟 Supernova). Dos 🌟 no se fusionan.

## 4. Huevos — FASE 1 (piso móvil desde los 20 pisos)

- Cada **5 s** cae un huevo 🥚 en un lugar al azar del campo del **piso de los huevos**. Los demás pisos se alimentan con merges y compras.
- **Piso de los huevos** = piso más alto desbloqueado − `EGG_FLOOR_LAG` (2), como mínimo el piso 1. A medida que se abren pisos, los huevos suben:

  | Piso más alto abierto | 1 a 3 | 4 | 5 | … | 10 | … | 20 |
  |---|---|---|---|---|---|---|---|
  | Los huevos caen en | Piso 1 | Piso 2 | Piso 3 | … | Piso 8 | … | Piso 18 |

- **Pisos abiertos:** quedan 3, el de los huevos, uno intermedio y el más alto; los de abajo se cierran (§8). Hasta hace poco los huevos caían 3 pisos abajo y quedaban 4 abiertos.

- **Cuando sube:** el piso donde caían queda **cerrado** (§8): se vacía, con los huevos que tenía. Al final de la animación de cierre se pasa al piso nuevo de los huevos, aparece el aviso "🥚 ¡Ahora los huevos caen en el Piso N: nombre!" y su pestaña salta.
- En una partida nueva, el primer huevo cae a **1 s**, para que el campo no arranque vacío.
- **Dónde cae:** se sortean 12 posiciones candidatas y se elige la más alejada de las entidades existentes, para que no se amontonen.
- **Animación de caída:** el huevo cae desde arriba con rebote y su sombra crece al acercarse al suelo. En reposo se balancea, invitando a tocarlo.
- **Abrir:** al tocarlo o hacer clic, se sacude, se rompe con partículas y sale la criatura de **tier 1 del piso donde está el huevo** (`n = piso×6 + 1`), en la misma posición. Un huevo del Piso 7 da una 🐟 Trucha.
- Los huevos **no se arrastran** y no generan monedas.
- **Campo lleno** (12 entidades contando huevos, en el piso de los huevos):
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
- **Nivel 120:** no se fusiona; se avisa "¡Nivel máximo!".
- **Monedas pendientes:** al fusionar, lo que las dos criaturas tenían acumulado para su próximo pulso se cobra en el momento, así que no se pierde nada.

## 6. Descubrimiento — FASE 1

- La **primera vez** que aparece una criatura (incluida la Oruga del primer huevo), se muestra el popup "¡Nueva criatura descubierta!" con la criatura en grande, su nombre, su piso y su ingreso por segundo.
- **Cola:** si se descubren varias seguidas, los popups se muestran en orden. Cada popup espera a que termine la animación que lo provocó.
- **Pisos desbloqueados:** se **derivan** de lo descubierto. El piso `f` está desbloqueado si ya se descubrió su tier 1; el piso 1 siempre lo está.
- **Máximo descubierto:** el nivel más alto en la lista de descubiertas. Se usa en la tienda de F3.

## 7. Economía

### 7.1 Ingreso pasivo — FASE 1

```
ingreso(n) = INCOME_BASE × INCOME_GROWTH^(n−1)  =  0.8 × 2.5^(n−1)  monedas/segundo
```

- **`INCOME_BASE` era 1:** se bajó 20 % para que la partida dure más (§7.6).

- **Fusionar siempre conviene:** dos criaturas de nivel `n` producen `2·ingreso(n)`, y la fusión produce `2.5·ingreso(n)`.
- **Ingreso total:** la suma de todas las criaturas de **todos** los pisos. Los huevos no cuentan.
- **Pulsos:** cada criatura acumula su producción y cada **3 s** la "suelta". Aparece un texto flotante "+X" sobre ella y el contador sube en ese momento. El promedio es exactamente `ingreso(n)` por segundo.
- **HUD:** arriba se ven las monedas (abreviadas) y el ingreso total "+X/s".
- **Pestaña oculta o juego cerrado:** en F1 no genera ingreso. En F3 se agrega el ingreso offline.

### 7.2 Abreviaturas

Se usa punto decimal y se **trunca** (nunca se muestra más de lo que hay).

- **Menos de 100 en su escala:** un decimal (`7.5`, `1.2K`, `56.3M`).
- **Desde 100:** sin decimales (`244`, `123K`).
- **Sufijos:** K, M, B, T, Qa, Qi, Sx, Sp, oc, No, Dc, Ud, Dd, Td, Qad, Qid, Sxd, Spd, ocd, Nod, Vg (10³ a 10⁶³). Los precios más altos rondan los 10⁵⁰ (Qid). Desde 10⁶⁶, notación científica (`1.00e66`).
  - Los de octillón (`oc`, `ocd`) van con "o" minúscula: en la fuente del juego la "O" mayúscula es igual a un cero, y `29Oc` se leía "290c" (diez veces más).
- **Contador de monedas:** muestra la parte entera.

Ejemplos: 999 → `999` · 1000 → `1K` · 1234 → `1.2K` · 3 456 789 → `3.4M` · 5.6×10⁹ → `5.6B`.

### 7.3 Tienda — FASE 3

```
precio(n, k) = SHOP_BASE_PRICE × SHOP_PRICE_GROWTH^(n−1) × SHOP_PURCHASE_GROWTH^k
             = 70 × 2.54^(n−1) × 1.15^k        (k = compras previas de esa criatura)
```

- Solo se pueden comprar criaturas hasta **2 niveles por debajo** de la máxima descubierta (`n ≤ maxDescubierto − 2`).
- La criatura comprada aparece en el campo de **su** piso, en un lugar libre y con un "pop". Respeta la capacidad.
- **Repago** de la primera compra: `precio/ingreso = 87.5 × 1.016^(n−1)` segundos (de 1.5 min en n=1 a ~9.3 min en n=118, el máximo comprable).
- **Por qué esos valores:** el precio tiene que crecer apenas más rápido que el ingreso (2.54 contra 2.5). Con 3, como había con 5 pisos, el repago crecía 20 % por nivel: desde el piso 6 la tienda ya no servía y la partida no terminaba (el simulador no pasaba del piso 8 en 48 h). Lo verifica `shop.test.ts`: `1 < SHOP_PRICE_GROWTH / INCOME_GROWTH < 1.05`. Con estos valores se termina en unas 5 h 20 min (§7.6).
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
| 1 | 1 Jardín · 1 | 🐛 Oruga | 0.8 | +2.4 | 70 | 1.5 min |
| 2 | 1 Jardín · 2 | 🐌 Caracol | 2 | +6 | 177 | 1.5 min |
| 3 | 1 Jardín · 3 | 🐜 Hormiga | 5 | +15 | 451 | 1.5 min |
| 4 | 1 Jardín · 4 | 🐞 Vaquita | 12.5 | +37.5 | 1.1K | 1.5 min |
| 5 | 1 Jardín · 5 | 🐝 Abeja | 31.2 | +93.7 | 2.9K | 1.6 min |
| 6 | 1 Jardín · 6 | 🦋 Mariposa | 78.1 | +234 | 7.4K | 1.6 min |
| 7 | 2 Granja · 1 | 🐣 Pollito | 195 | +585 | 18.7K | 1.6 min |
| 8 | 2 Granja · 2 | 🐓 Gallo | 488 | +1.4K | 47.7K | 1.6 min |
| 9 | 2 Granja · 3 | 🐇 Conejo | 1.2K | +3.6K | 121K | 1.7 min |
| 10 | 2 Granja · 4 | 🐖 Chancho | 3K | +9.1K | 308K | 1.7 min |
| 11 | 2 Granja · 5 | 🐑 Oveja | 7.6K | +22.8K | 782K | 1.7 min |
| 12 | 2 Granja · 6 | 🐄 Vaca | 19K | +57.2K | 1.9M | 1.7 min |
| 13 | 3 Bosque · 1 | 🦔 Erizo | 47.6K | +143K | 5M | 1.8 min |
| 14 | 3 Bosque · 2 | 🐿️ Ardilla | 119K | +357K | 12.8M | 1.8 min |
| 15 | 3 Bosque · 3 | 🦉 Búho | 298K | +894K | 32.5M | 1.8 min |
| 16 | 3 Bosque · 4 | 🦡 Tejón | 745K | +2.2M | 82.7M | 1.9 min |
| 17 | 3 Bosque · 5 | 🦌 Ciervo | 1.8M | +5.5M | 210M | 1.9 min |
| 18 | 3 Bosque · 6 | 🐻 Oso | 4.6M | +13.9M | 533M | 1.9 min |
| 19 | 4 Océano · 1 | 🐠 Pez | 11.6M | +34.9M | 1.3B | 1.9 min |
| 20 | 4 Océano · 2 | 🦀 Cangrejo | 29.1M | +87.3M | 3.4B | 2.0 min |
| 21 | 4 Océano · 3 | 🐙 Pulpo | 72.7M | +218M | 8.7B | 2.0 min |
| 22 | 4 Océano · 4 | 🐬 Delfín | 181M | +545M | 22.2B | 2.0 min |
| 23 | 4 Océano · 5 | 🦈 Tiburón | 454M | +1.3B | 56.4B | 2.1 min |
| 24 | 4 Océano · 6 | 🐋 Ballena | 1.1B | +3.4B | 143B | 2.1 min |
| 25 | 5 Pantano · 1 | 🦟 Mosquito | 2.8B | +8.5B | 364B | 2.1 min |
| 26 | 5 Pantano · 2 | 🐸 Rana | 7.1B | +21.3B | 924B | 2.2 min |
| 27 | 5 Pantano · 3 | 🦎 Lagartija | 17.7B | +53.2B | 2.3T | 2.2 min |
| 28 | 5 Pantano · 4 | 🐢 Tortuga | 44.4B | +133B | 5.9T | 2.2 min |
| 29 | 5 Pantano · 5 | 🦛 Hipopótamo | 111B | +333B | 15.1T | 2.3 min |
| 30 | 5 Pantano · 6 | 🐊 Cocodrilo | 277B | +832B | 38.4T | 2.3 min |
| 31 | 6 Ciudad · 1 | 🐀 Rata | 693B | +2T | 97.7T | 2.3 min |
| 32 | 6 Ciudad · 2 | 🐦 Gorrión | 1.7T | +5.2T | 248T | 2.4 min |
| 33 | 6 Ciudad · 3 | 🦝 Mapache | 4.3T | +13T | 630T | 2.4 min |
| 34 | 6 Ciudad · 4 | 🐈 Gato | 10.8T | +32.5T | 1.6Qa | 2.5 min |
| 35 | 6 Ciudad · 5 | 🐕 Perro | 27.1T | +81.3T | 4Qa | 2.5 min |
| 36 | 6 Ciudad · 6 | 🐩 Caniche | 67.7T | +203T | 10.3Qa | 2.5 min |
| 37 | 7 Lago · 1 | 🐟 Trucha | 169T | +508T | 26.2Qa | 2.6 min |
| 38 | 7 Lago · 2 | 🦆 Pato | 423T | +1.2Qa | 66.6Qa | 2.6 min |
| 39 | 7 Lago · 3 | 🦦 Nutria | 1Qa | +3.1Qa | 169Qa | 2.7 min |
| 40 | 7 Lago · 4 | 🦫 Castor | 2.6Qa | +7.9Qa | 430Qa | 2.7 min |
| 41 | 7 Lago · 5 | 🦢 Cisne | 6.6Qa | +19.8Qa | 1Qi | 2.8 min |
| 42 | 7 Lago · 6 | 🦩 Flamenco | 16.5Qa | +49.6Qa | 2.7Qi | 2.8 min |
| 43 | 8 Pradera · 1 | 🐁 Ratón | 41.3Qa | +124Qa | 7Qi | 2.8 min |
| 44 | 8 Pradera · 2 | 🐹 Hámster | 103Qa | +310Qa | 17.9Qi | 2.9 min |
| 45 | 8 Pradera · 3 | 🦃 Pavo | 258Qa | +775Qa | 45.4Qi | 2.9 min |
| 46 | 8 Pradera · 4 | 🐗 Jabalí | 646Qa | +1.9Qi | 115Qi | 3.0 min |
| 47 | 8 Pradera · 5 | 🐃 Búfalo | 1.6Qi | +4.8Qi | 293Qi | 3.0 min |
| 48 | 8 Pradera · 6 | 🐎 Mustang | 4Qi | +12.1Qi | 745Qi | 3.1 min |
| 49 | 9 Desierto · 1 | 🪲 Escarabajo | 10Qi | +30.2Qi | 1.8Sx | 3.1 min |
| 50 | 9 Desierto · 2 | 🦂 Escorpión | 25.2Qi | +75.7Qi | 4.8Sx | 3.2 min |
| 51 | 9 Desierto · 3 | 🐍 Serpiente | 63.1Qi | +189Qi | 12.2Sx | 3.2 min |
| 52 | 9 Desierto · 4 | 🦊 Fénec | 157Qi | +473Qi | 31Sx | 3.3 min |
| 53 | 9 Desierto · 5 | 🦘 Canguro | 394Qi | +1.1Sx | 78.7Sx | 3.3 min |
| 54 | 9 Desierto · 6 | 🐫 Camello | 986Qi | +2.9Sx | 200Sx | 3.4 min |
| 55 | 10 Sabana · 1 | 🦓 Cebra | 2.4Sx | +7.3Sx | 508Sx | 3.4 min |
| 56 | 10 Sabana · 2 | 🦒 Jirafa | 6.1Sx | +18.4Sx | 1.2Sp | 3.5 min |
| 57 | 10 Sabana · 3 | 🐆 Leopardo | 15.4Sx | +46.2Sx | 3.2Sp | 3.5 min |
| 58 | 10 Sabana · 4 | 🦏 Rinoceronte | 38.5Sx | +115Sx | 8.3Sp | 3.6 min |
| 59 | 10 Sabana · 5 | 🐘 Elefante | 96.2Sx | +288Sx | 21.1Sp | 3.7 min |
| 60 | 10 Sabana · 6 | 🦁 León | 240Sx | +722Sx | 53.7Sp | 3.7 min |
| 61 | 11 Selva · 1 | 🦜 Loro | 601Sx | +1.8Sp | 136Sp | 3.8 min |
| 62 | 11 Selva · 2 | 🐒 Mono | 1.5Sp | +4.5Sp | 346Sp | 3.8 min |
| 63 | 11 Selva · 3 | 🦥 Perezoso | 3.7Sp | +11.2Sp | 880Sp | 3.9 min |
| 64 | 11 Selva · 4 | 🐅 Tigre | 9.4Sp | +28.2Sp | 2.2oc | 4.0 min |
| 65 | 11 Selva · 5 | 🦧 Orangután | 23.5Sp | +70.5Sp | 5.6oc | 4.0 min |
| 66 | 11 Selva · 6 | 🦍 Gorila | 58.7Sp | +176Sp | 14.4oc | 4.1 min |
| 67 | 12 Montaña · 1 | 🐐 Cabra | 146Sp | +440Sp | 36.6oc | 4.2 min |
| 68 | 12 Montaña · 2 | 🐏 Carnero | 367Sp | +1.1oc | 93.1oc | 4.2 min |
| 69 | 12 Montaña · 3 | 🦙 Llama | 918Sp | +2.7oc | 236oc | 4.3 min |
| 70 | 12 Montaña · 4 | 🐂 Yak | 2.2oc | +6.8oc | 600oc | 4.4 min |
| 71 | 12 Montaña · 5 | 🦬 Bisonte | 5.7oc | +17.2oc | 1.5No | 4.4 min |
| 72 | 12 Montaña · 6 | 🦅 Cóndor | 14.3oc | +43oc | 3.8No | 4.5 min |
| 73 | 13 Polo · 1 | 🐧 Pingüino | 35.8oc | +107oc | 9.8No | 4.6 min |
| 74 | 13 Polo · 2 | 🦭 Foca | 89.6oc | +269oc | 25No | 4.6 min |
| 75 | 13 Polo · 3 | 🐺 Lobo ártico | 224oc | +672oc | 63.5No | 4.7 min |
| 76 | 13 Polo · 4 | 🐳 Orca | 560oc | +1.6No | 161No | 4.8 min |
| 77 | 13 Polo · 5 | ☃️ Muñeco de nieve | 1.4No | +4.2No | 409No | 4.9 min |
| 78 | 13 Polo · 6 | 🦣 Mamut | 3.5No | +10.5No | 1Dc | 5.0 min |
| 79 | 14 Noche · 1 | 🦗 Grillo | 8.7No | +26.2No | 2.6Dc | 5.0 min |
| 80 | 14 Noche · 2 | 🕷️ Araña | 21.8No | +65.6No | 6.7Dc | 5.1 min |
| 81 | 14 Noche · 3 | 🦨 Zorrillo | 54.7No | +164No | 17Dc | 5.2 min |
| 82 | 14 Noche · 4 | 🦇 Murciélago | 136No | +410No | 43.3Dc | 5.3 min |
| 83 | 14 Noche · 5 | 🌚 Luna nueva | 342No | +1Dc | 110Dc | 5.4 min |
| 84 | 14 Noche · 6 | 🌝 Luna llena | 855No | +2.5Dc | 279Dc | 5.4 min |
| 85 | 15 Prehistoria · 1 | 🪱 Lombriz | 2.1Dc | +6.4Dc | 709Dc | 5.5 min |
| 86 | 15 Prehistoria · 2 | 🦐 Trilobite | 5.3Dc | +16Dc | 1.8Ud | 5.6 min |
| 87 | 15 Prehistoria · 3 | 🐚 Amonite | 13.3Dc | +40Dc | 4.5Ud | 5.7 min |
| 88 | 15 Prehistoria · 4 | 🦤 Dodo | 33.4Dc | +100Dc | 11.6Ud | 5.8 min |
| 89 | 15 Prehistoria · 5 | 🦕 Saurópodo | 83.5Dc | +250Dc | 29.5Ud | 5.9 min |
| 90 | 15 Prehistoria · 6 | 🦖 Tiranosaurio | 208Dc | +626Dc | 75Ud | 6.0 min |
| 91 | 16 Abismo · 1 | 🦪 Ostra | 522Dc | +1.5Ud | 190Ud | 6.1 min |
| 92 | 16 Abismo · 2 | 🐡 Pez globo | 1.3Ud | +3.9Ud | 484Ud | 6.2 min |
| 93 | 16 Abismo · 3 | 🦞 Langosta | 3.2Ud | +9.7Ud | 1.2Dd | 6.3 min |
| 94 | 16 Abismo · 4 | 🦑 Calamar gigante | 8.1Ud | +24.4Ud | 3.1Dd | 6.4 min |
| 95 | 16 Abismo · 5 | 🧜 Sirena | 20.3Ud | +61.1Ud | 7.9Dd | 6.5 min |
| 96 | 16 Abismo · 6 | 🐉 Leviatán | 50.9Ud | +152Ud | 20.1Dd | 6.6 min |
| 97 | 17 Mansión · 1 | 🎃 Calabaza | 127Ud | +382Ud | 51.1Dd | 6.7 min |
| 98 | 17 Mansión · 2 | 👻 Fantasma | 318Ud | +955Ud | 130Dd | 6.8 min |
| 99 | 17 Mansión · 3 | 💀 Calavera | 796Ud | +2.3Dd | 330Dd | 6.9 min |
| 100 | 17 Mansión · 4 | 🧟 Zombi | 1.9Dd | +5.9Dd | 838Dd | 7.0 min |
| 101 | 17 Mansión · 5 | 🧛 Vampiro | 4.9Dd | +14.9Dd | 2.1Td | 7.1 min |
| 102 | 17 Mansión · 6 | 🧙 Bruja | 12.4Dd | +37.3Dd | 5.4Td | 7.2 min |
| 103 | 18 Reino mágico · 1 | 🧚 Hada | 31.1Dd | +93.3Dd | 13.7Td | 7.4 min |
| 104 | 18 Reino mágico · 2 | 🧝 Elfo | 77.7Dd | +233Dd | 34.9Td | 7.5 min |
| 105 | 18 Reino mágico · 3 | 👹 Ogro | 194Dd | +583Dd | 88.6Td | 7.6 min |
| 106 | 18 Reino mágico · 4 | 🧞 Genio | 486Dd | +1.4Td | 225Td | 7.7 min |
| 107 | 18 Reino mágico · 5 | 🦄 Unicornio | 1.2Td | +3.6Td | 572Td | 7.8 min |
| 108 | 18 Reino mágico · 6 | 🐲 Dragón | 3Td | +9.1Td | 1.4Qad | 8.0 min |
| 109 | 19 Juguetería · 1 | 🧸 Osito | 7.5Td | +22.7Td | 3.6Qad | 8.1 min |
| 110 | 19 Juguetería · 2 | 🐴 Caballito | 18.9Td | +56.9Td | 9.3Qad | 8.2 min |
| 111 | 19 Juguetería · 3 | 🪆 Matrioska | 47.4Td | +142Td | 23.8Qad | 8.4 min |
| 112 | 19 Juguetería · 4 | 🤡 Payaso | 118Td | +356Td | 60.4Qad | 8.5 min |
| 113 | 19 Juguetería · 5 | 👾 Pixelito | 296Td | +890Td | 153Qad | 8.6 min |
| 114 | 19 Juguetería · 6 | 🤖 Robot | 741Td | +2.2Qad | 390Qad | 8.8 min |
| 115 | 20 Galaxia · 1 | 👽 Alien | 1.8Qad | +5.5Qad | 991Qad | 8.9 min |
| 116 | 20 Galaxia · 2 | 🛸 Platillo volador | 4.6Qad | +13.9Qad | 2.5Qid | 9.0 min |
| 117 | 20 Galaxia · 3 | ☄️ Cometa | 11.5Qad | +34.7Qad | 6.3Qid | 9.2 min |
| 118 | 20 Galaxia · 4 | 🪐 Planeta viviente | 28.9Qad | +86.9Qad | 16.2Qid | 9.3 min |
| 119 | 20 Galaxia · 5 | 🌞 Sol viviente | 72.4Qad | +217Qad | 41.2Qid | 9.5 min |
| 120 | 20 Galaxia · 6 | 🌟 Supernova | 181Qad | +543Qad | 104Qid | 9.6 min |


### 7.6 Duración de la partida

`npm run simulate` juega una partida entera con un jugador automático y mide cuándo se abre cada piso. El jugador hace **2 acciones por segundo**: abre un huevo, fusiona los dos iguales de nivel más bajo o compra en la tienda el nivel más caro que pueda pagar (mirando hasta 3 niveles por debajo del máximo a la venta). No cuenta el ingreso offline.

| Piso | Se desbloquea | Lo que tarda ese piso |
|---|---:|---:|
| 1 Jardín | menos de 1 min | 2 min |
| 2 Granja | 2 min | 5 min |
| 3 Bosque | 8 min | 7 min |
| 4 Océano | 15 min | 7 min |
| 5 Pantano | 23 min | 8 min |
| 6 Ciudad | 31 min | 9 min |
| 7 Lago | 41 min | 10 min |
| 8 Pradera | 51 min | 11 min |
| 9 Desierto | 1 h 2 min | 12 min |
| 10 Sabana | 1 h 15 min | 13 min |
| 11 Selva | 1 h 29 min | 15 min |
| 12 Montaña | 1 h 44 min | 16 min |
| 13 Polo | 2 h | 18 min |
| 14 Noche | 2 h 19 min | 20 min |
| 15 Prehistoria | 2 h 39 min | 22 min |
| 16 Abismo | 3 h 1 min | 24 min |
| 17 Mansión | 3 h 25 min | 26 min |
| 18 Reino mágico | 3 h 52 min | 29 min |
| 19 Juguetería | 4 h 21 min | 32 min |
| 20 Galaxia | 4 h 54 min | 29 min |

- **Total: 5 h 23 min**, igual con otras semillas. Los primeros pisos salen en pocos minutos; los últimos, en unos 25 cada uno.
- **Ingreso −20 %** (`INCOME_BASE` de 1 a 0.8, para que la partida dure más): antes terminaba en 4 h 19 min.
- Cerrar los pisos que quedan por debajo del de los huevos (§8) no cambia la tabla: lo que tenían rendía muy poco.
- La velocidad del jugador casi no cambia el resultado: lo que manda es la tienda.
- **Huevos contra tienda:** por cantidad, el 76 % de las criaturas nuevas salen de huevos; por ingreso, el 0.019 %. Un huevo da el tier 1 de un piso 2 por debajo del más alto, unos 12 niveles por debajo de lo que vende la tienda (2.5¹² ≈ 60 000 veces menos). Bajar el ingreso no cambia esa proporción; acercar los huevos al piso más alto, sí:

  | `EGG_FLOOR_LAG` | Pisos abiertos | Ingreso que aportan los huevos | Partida completa |
  |---|---|---|---|
  | 3 | 4 | 0.00008 % | 5 h 23 min |
  | **2** | **3** | **0.019 %** | **5 h 23 min** (actual) |
  | 1 | 2 | 3.6 % | 4 h 27 min |
- **Referencia:** con la economía de 5 pisos, el simulador tardaba 1.5–2 h en algo que un jugador real terminaba en 30–60 min. Una persona atenta puede ir más rápido que el simulador.
- **Para ajustar la duración:** `SHOP_BASE_PRICE` y `INCOME_BASE` la cambian de forma casi proporcional; `SHOP_PRICE_GROWTH`, de forma exponencial. Algunas pruebas (con `INCOME_BASE` 0.8):

  | `SHOP_PRICE_GROWTH` | `SHOP_BASE_PRICE` | Partida completa |
  |---|---|---|
  | 2.53 | 60 | 3 h 29 min |
  | 2.54 | 60 | 4 h 38 min |
  | **2.54** | **70** | **5 h 23 min** (actual) |
  | 2.55 | 60 | 6 h 14 min |
  | 3 | 15 | no termina (la de 5 pisos) |

## 8. Pisos — FASE 2

- **Pestañas:** al pie de la pantalla hay una por piso y se ven **5 a la vez**, con una flecha ◀ ▶ a cada costado.
  - **Desbloqueada:** muestra la primera criatura del piso, su nombre y la ocupación ("7/12", en rojo si está lleno). Los nombres largos se achican para entrar.
  - **La del piso que se ve:** queda levantada y con borde blanco.
  - **La del piso de los huevos:** lleva un 🥚 en la esquina.
  - **Bloqueada:** muestra 🔒 y "Piso N". Tocarla no cambia de piso: en el próximo a abrir, avisa qué fusionar ("Para abrir el Piso 3: fusioná Vaca + Vaca"); en los de más arriba, solo el orden ("El Piso 14 se abre después del Piso 13"), para no adelantar criaturas.
  - **Cerrada:** persiana marrón con 🔒 y el nombre del piso. Tocarla no cambia de piso y avisa "🔒 El Piso 1 (Jardín) quedó cerrado: los huevos ya caen más arriba".
- **Qué pisos se ven:** la barra se acomoda sola al cambiar de piso (se desliza hasta ahí). Deja el piso que se ve en el centro y, si entra, también el de los huevos: jugando en el piso más alto, se ven el de los huevos, el actual y el próximo a abrir.
- **Deslizar la barra:** se arrastra con el dedo (o se usa la rueda del mouse) para mirar otros pisos, sin cambiar de piso.
  - Al soltarla se acomoda en una pestaña entera. Con un movimiento rápido sigue de largo (impulso); despacio, queda donde se la dejó.
  - Pasado un extremo se resiste y vuelve.
  - Un toque sin arrastrar elige la pestaña.
- **Flechas de la barra:** corren la vista de a 5 pisos, sin cambiar de piso (sirven para mirar qué viene o volver a uno lejano). En los extremos se apagan.
- **Otras formas de cambiar de piso:**
  - En escritorio, las flechas ← y → del teclado van al piso abierto anterior o siguiente (se saltean los cerrados).
  - Tocar "Los huevos caen en el Piso N ›" en el HUD lleva a ese piso.
- **Cambio de piso:** el campo hace un fundido y se redibuja con el color, la decoración y las criaturas de ese piso. La página toma el color del piso.
- **Campos independientes:** cada piso tiene su propio campo y su capacidad de 12. Las criaturas de cada piso se fusionan ahí; dos tier 6 suben al piso siguiente.
- **Huevos:** caen solo en el piso de los huevos (§4), también mientras se mira otro piso. En los demás pisos, la barra del huevo del HUD se reemplaza por "Los huevos caen en el Piso N ›".
- **Ingreso:** todos los pisos generan ingreso aunque no se estén viendo; los "+X" se ven solo en el piso que está en pantalla.
- **Avisos:** cuando se desbloquea un piso o le llega una criatura mientras no se lo ve, su pestaña late. Si la pestaña no está a la vista, late la flecha de ese lado.
- **Al abrir el juego** (desde el link, el acceso directo o al recargar) se ve el piso más alto desbloqueado, que es donde avanza la partida. El piso que se mira es estado de la vista, no se guarda.
- **Al reiniciar** se vuelve al piso 1 y los demás se bloquean.

### Pisos cerrados

- **Cuáles:** los que quedan por debajo del piso de los huevos (§4). Cuando los huevos suben, el piso donde caían queda "en el olvido": sus criaturas rinden muy poco al lado de las de arriba, así que **desaparecen**, con sus huevos. El piso no se puede volver a ver y no genera ingreso.
- **Qué se ve, en orden** (nada se pisa con la apertura del piso nuevo):
  1. el merge que abre el piso nuevo y el popup de su criatura;
  2. al cerrar el popup, el campo va al piso que se cierra y se ven sus criaturas por última vez;
  3. baja una persiana marrón de tablillas desde una caja arriba del campo (traqueteo), golpea abajo (sacudón) y tapa todo;
  4. aparece un candado 🔒 grande con un cartel "Cerrado";
  5. pasa al piso nuevo de los huevos, con el aviso "🥚 ¡Ahora los huevos caen en el Piso N: nombre!" y su pestaña latiendo.

  Mientras dura no se puede tocar el campo, cambiar de piso ni abrir la tienda. Si se cierran varios pisos juntos (solo con herramientas de debug), cada uno tiene su persiana, uno detrás del otro.
- **Lógica:** el cierre ocurre en el juego al instante, junto con el merge; la persiana muestra lo que había antes de vaciarse.
- **Guardados anteriores:** al cargar, los pisos que ya estaban por debajo del de los huevos se vacían sin animación.
- **Tienda:** no vende criaturas de pisos cerrados.

## 9. Interfaz — FASES 1 a 3

- **Barra superior:**
  - monedas con un ícono de moneda y el ingreso total "+X/s";
  - el nombre del piso que se ve y el botón **🛒 Tienda**;
  - en el piso de los huevos, la barra del próximo huevo; en los demás, en qué piso caen (tocándolo, lleva ahí);
  - la capacidad del piso que se ve ("7/12").
- **Campo:** fondo del color del piso con decoración tenue.
- **Banner** "¡Campo lleno!" mientras no quede lugar en el piso que se ve.
- **Popups:** "¡Nueva criatura descubierta!", la tienda, la bienvenida tras una ausencia, la confirmación de reinicio y los pasos del acceso directo. Se muestran de a uno y, mientras están abiertos, bloquean el campo, las pestañas y el teclado. Los descubrimientos y los cierres de pisos (§8) van en una misma cola, en el orden en que pasaron.
- **Toasts:** avisos cortos ("¡Piso 2 desbloqueado!", "¡Ahora los huevos caen en el Piso 2: Granja!", "El Piso 2 está lleno", "¡Nivel máximo!", qué abre un piso bloqueado, que un piso quedó cerrado). Los largos pasan a dos líneas.
- **Pie:** las pestañas de pisos (5 a la vista, deslizables y con flechas) y, debajo, una pista de cómo jugar, el botón verde 📲 de acceso directo (cuando se ofrece, §14), los botones redondos 🔊 (efectos) y 🎵 (música) y el botón **Reiniciar** (abajo, para no tocarlo sin querer). Si la pista no entra antes de los botones, se achica.

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
- **Guardados de cuando había 5 pisos:** cargan sin migración, porque los niveles son los mismos. Se completan los pisos y las compras que faltan, y los pisos nuevos arrancan bloqueados. El viejo piso 5 (Galaxia, niveles 25–30) pasa a ser el Pantano.
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
| `EGG_FLOOR_LAG` | 2 | Cuántos pisos por debajo del más alto desbloqueado caen los huevos (como mínimo, en el 1). Quedan abiertos `EGG_FLOOR_LAG + 1` pisos. Era 3. |
| `SPAWN_CANDIDATES` | 12 | Posiciones sorteadas para elegir dónde cae un huevo. |
| `INCOME_BASE` | 0.8 | Ingreso del nivel 1 (monedas/s). Era 1 (§7.6). |
| `INCOME_GROWTH` | 2.5 | Factor de ingreso por nivel. |
| `COIN_POP_INTERVAL_MS` | 3000 | Cada cuánto suelta monedas una criatura. |
| `MAX_TICK_MS` | 1000 | Tope de tiempo simulado por frame (evita saltos). |
| `AUTOSAVE_INTERVAL_MS` | 10000 | Autoguardado. |
| `SHOP_BASE_PRICE` | 70 | Tienda · precio del nivel 1. |
| `SHOP_PRICE_GROWTH` | 2.54 | Tienda · factor de precio por nivel (apenas más que `INCOME_GROWTH`, ver §7.3). |
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

### Extra — 20 pisos ✅
- [x] 20 pisos de temáticas distintas, con 120 criaturas.
- [x] Los huevos suben de piso: caen por debajo del más alto abierto (eran 3 pisos; hoy, 2), y de cada huevo sale el tier 1 de su piso.
- [x] Barra de pestañas con 5 pisos a la vista y flechas; 🥚 en la pestaña del piso de los huevos; atajo desde el HUD.
- [x] Economía rebalanceada con un simulador (`npm run simulate`): unas 4 h para terminar.

### Extra — navegación ✅
- [x] El juego abre en el piso más alto desbloqueado.
- [x] Barra de pestañas deslizable con el dedo (con impulso) y con la rueda del mouse, además de las flechas.

### Extra — partida más lenta ✅
- [x] Ingreso de todas las criaturas −20 % (`INCOME_BASE` 0.8): la partida pasa de 4 h 19 min a 5 h 23 min.
- [x] Los huevos caen 2 pisos por debajo del más alto (eran 3): quedan 3 pisos abiertos.

### Extra — acceso directo ✅
- [x] Instalable como app (manifest e íconos): abre a pantalla completa, en vertical.
- [x] Botón 📲 en el pie: el diálogo del navegador, o los pasos para Android e iPhone.

### Extra — pisos cerrados ✅
- [x] Cuando los huevos suben, el piso de abajo se cierra: se vacía y queda con candado.
- [x] Animación en orden: popup de la criatura nueva, persiana en el piso que se cierra y paso al piso de los huevos.

### Ideas futuras (sin fase asignada)
Arte definitivo para las 120 criaturas, logros, tutorial guiado y juego sin conexión.

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
| Se cierra un piso | persiana que baja traqueteando (`shutter`), golpe al llegar abajo (`shutterLand`) y clic del candado (`lock`) |
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

## 14. Acceso directo

El juego se puede instalar en el celular como una app: queda un ícono en la pantalla de inicio y abre sin la barra del navegador.

- **Manifest** (`public/manifest.webmanifest`): nombre "Fusionitos", pantalla completa (`standalone`) y en vertical, color #1f3d1b y el ícono del huevo.
  - Los íconos están en `public/icons/`: 192 y 512 px, uno *maskable* (el dibujo al 80 %, para los íconos redondos de Android) y el de iPhone (180 px). Se renderizan desde `icon.svg`.
  - No hay service worker: Chrome ya no lo pide para instalar. Sin conexión, el juego no abre.
- **Botón 📲** (verde, en el pie):
  - Si el navegador avisa que se puede instalar (Chrome, Edge, Samsung Internet), abre su diálogo. Ese aviso se guarda al cargar y no se muestra el cartel automático del navegador.
  - Si no avisa (Safari, o Chrome abierto desde otra app como WhatsApp), muestra los pasos: en iPhone, Compartir → «Agregar a inicio»; en Android, el menú ⋮ → «Agregar a la pantalla principal» (o primero «Abrir en Chrome»).
  - No aparece en la compu sin aviso del navegador, ni con el juego abierto como app, ni después de instalarlo (se recuerda en `fusionitos.installed`).
- **Progreso:** en Android, la app y el navegador comparten el guardado. En iPhone, la app de la pantalla de inicio tiene su propio guardado, aparte del de Safari.
- **Al abrirlo** se ve el piso más alto desbloqueado (§8).
