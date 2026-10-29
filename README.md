# Fusionitos 🥚

Juego web *merge idle*: caen huevos, nacen criaturas y, al juntar dos iguales, evolucionan.
Descubrí las 120 criaturas de los 20 pisos, del Jardín a la Galaxia.

**▶ Jugar:** https://felipearanguren.github.io/fusionitos/ (celular y escritorio)

## Cómo se juega

- Tocá los huevos para abrirlos.
- Arrastrá una criatura sobre otra igual para fusionarlas.
- Dos del último nivel de un piso suben al piso siguiente y lo desbloquean.
- A medida que abrís pisos, los huevos caen más arriba: siempre 3 pisos por debajo del más alto.
- Cada criatura genera monedas; en la 🛒 Tienda comprás más.
- Mientras no jugás, tus criaturas siguen produciendo (50 %, hasta 4 horas).

## Desarrollo

Phaser 3 + TypeScript + Vite, sin backend: el progreso se guarda en el navegador.

```bash
npm install
npm run dev
```

- `npm test`: tests (Vitest).
- `npm run build`: build de producción en `dist/`.
- Cada push a `master` corre los tests y publica el juego en GitHub Pages (`.github/workflows/deploy.yml`).

Documentación: [GAME_DESIGN.md](GAME_DESIGN.md) (reglas, fórmulas y criaturas) y [CLAUDE.md](CLAUDE.md) (convenciones).
