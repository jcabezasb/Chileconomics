# CLAUDE.md

Guía para agentes que trabajan en este repositorio. Detalles en `docs/arquitectura.md` y
`docs/flujo-de-trabajo.md`.

## Contexto

Chileconomics (https://chileconomics.cl) es un dashboard macroeconómico de Chile con datos del Banco
Central. El dueño es economista y está aprendiendo desarrollo: explicar conceptos con claridad y en
español, y preferir soluciones simples y legibles.

## Reglas importantes

- `main` es producción (Vercel publica cada push). Trabajar en ramas; la vista previa de Vercel y el
  CI (`.github/workflows/ci.yml`) validan antes del merge.
- `public/data/bcch_series.json` lo genera `python/sync_bcch_data.py`: no editarlo a mano.
- Las series se referencian por **clave** (`dolar`, `pib_reg_RM`), definidas en
  `python/bcch_shared.py` y `src/data/bcch/seriesKeys.js`. Nunca por el código del Banco Central
  dentro del frontend.
- Nada de datos inventados o de relleno en la interfaz: si falta un dato, mostrar estado vacío.
- Antes de terminar: `npm run lint`, `npm test`, `npm run build` y, si se tocó Python,
  `python -m pytest python/tests`.

## Comandos

```bash
npm run dev          # http://localhost:5173
npm run lint         # ESLint (.js y .jsx, sin avisos permitidos)
npm test             # Vitest
npm run build
npm run sync-data    # requiere .env con BCCH_USER/BCCH_PASSWORD y el venv de Python activo
python -m pytest python/tests
```

## Mapa del código

- `src/app/`: `App.jsx` elige la vista según la URL (`routes.js`); hooks de ruta, tema y animaciones.
- `src/data/bcch/`: `client.js` (carga el JSON una vez), `indicators.js` (tarjetas y series de detalle),
  `useBcchData.js` (datos de la página Datos).
- `src/features/overview/`: `IndicatorCard` y la vista de detalle en `detail/` (desgloses por
  indicador en `detail/breakdowns/`). Rango de fechas y variación en 12 meses en `useIndicatorSeries`.
- `src/features/regional/`: `useRegionalView` (cálculos) + componentes de cada ficha.
- `src/features/pib/`: composición del PIB (`usePibComposition`).
- `src/shared/components/TrendChart.jsx`: todos los gráficos de línea (`detailed` agrega ejes).
- `src/shared/utils/`: funciones puras con pruebas (`*.test.js`).
- `src/styles/`: `global.css` importa las partes en orden; variables de tema en `variables.css`.
- `python/`: `bcch_shared.py` (registro de series), `sync_bcch_data.py`, pruebas en `python/tests/`.

## Convenciones

- Componentes funcionales con hooks; lógica de datos en hooks o funciones puras, no en el JSX.
- Fechas como texto `YYYY-MM-DD` (`shared/utils/dates.js`); números con `formatNumber` (formato es-CL).
- Estilos en archivos CSS con variables de tema; evitar estilos en línea salvo valores dinámicos.
- Comentarios y textos de la interfaz en español.
