# Plan de optimizacion sin cambios funcionales

## Objetivo
- Mejorar rendimiento, mantenibilidad y seguridad sin cambiar UI, datos ni flujos.
- Mantener la salida visual y la data equivalente a la actual.

## Reglas de este plan
- No cambiar funcionalidad ni comportamiento observado por el usuario.
- No cambiar series ni fuentes de datos.
- No agregar dependencias salvo que sean necesarias para refactor tecnico.

## Hallazgos clave (referencias)
- `src/App.jsx`: archivo monolitico (logica de datos + UI + formatos) con muchas funciones y mapas repetidos.
- `src/services/api.js`: formateadores duplicados y `loadBcchData` sin cache de promesa (posibles fetch duplicados).
- `sync_bcch_data.py`, `api/bcch-bundle.py`, `api/bcch-series.py`: duplicacion de `SERIES_CONFIG` y normalizacion.
- `src/components/Overview/MacroMap.jsx`: estilos y keyframes inline en render; `colorScale` no usado.
- `src/styles/global.css`: selector `.macro-map-frame` declarado dos veces.
- `src/styles/variables.css`: `--color-brand` duplicado.
- `.github/workflows/hourly_sync.yml`: nombre y mensaje de commit no alineados con cron diario.

## Plan de trabajo (orden recomendado)

### 1) Unificar constantes y formatos (bajo riesgo, alto impacto)
- [ ] Crear `src/constants/regions.js` con:
  - mapas de region (nombre -> id, id -> nombre, id -> codigo numerico, id -> codigo pob).
  - reemplazar `REGION_MAP`, `REGMAP`, `regionNameMap` en `src/App.jsx`.
- [ ] Crear `src/utils/format.js` con:
  - `formatNumber`, `formatMonthLabel`, `formatQuarterLabel`, `formatShortDate`.
  - cache de `Intl.NumberFormat` para evitar recreacion por render.
  - reemplazar funciones duplicadas en `src/App.jsx` y `src/services/api.js`.
- [ ] Extraer `buildSparklinePaths` a `src/utils/sparkline.js` y reutilizarlo en:
  - `src/App.jsx` (tabla PIB).
  - `src/components/Overview/CompactIndicator.jsx` (mini sparkline).

### 2) Normalizacion y cache de series (rendimiento)
- [ ] En `src/services/api.js`, agregar cache de promesa para `loadBcchData`:
  - `let bcchDataPromise = null;` y reutilizarla mientras se resuelve.
- [ ] Normalizar series una sola vez (cast a Number + filtros) dentro de `loadBcchData` o `getSeries`.
- [ ] Extraer helpers de series a `src/utils/series.js`:
  - `normalizeSeries`, `computeSeriesStatsAtDate`, `buildPeriods`, `mergeInvestmentSeries`, `buildGovernmentResidualSeries`.
  - consumirlos desde `src/App.jsx`.

### 3) Refactor de render y estilos (mantencion y CSP)
- [ ] Dividir `src/App.jsx` en subcomponentes:
  - `HeroHeader`, `OverviewSection`, `RegionalSection`, `RegionalLaborCards`.
  - mover logica de datos a un hook `src/hooks/useBcchData.js`.
- [ ] Usar `useMemo` para datos derivados que hoy se recalculan en cada render:
  - `baseIndicatorSpecs`, `sideIndicators`, `chartIndicators`, `regionalPibChartData`, `laborCards`.
- [ ] Mover estilos inline frecuentes a `src/styles/global.css`:
  - botones de rango, tooltip, toggle de tema, cajas de info.
  - mover keyframes de `MacroMap` a CSS.
- [ ] Eliminar constantes no usadas (`colorScale`, `glowStyle`) y consolidar CSS duplicado.

### 4) Consolidar pipeline BCCH (evitar deriva)
- [ ] Crear modulo Python compartido (ej: `bcch_shared.py`) con:
  - `SERIES_CONFIG`, `_normalize_dataframe`, `_parse_float`.
- [ ] Usarlo desde `sync_bcch_data.py`, `api/bcch-bundle.py`, `api/bcch-series.py`.
- [ ] (Opcional) Generar `SERIES_KEY_MAP` en `src/services/api.js` desde un JSON comun para evitar desalineamiento.

### 5) Higiene de tooling (no funcional)
- [ ] Ajustar nombre y mensaje en `.github/workflows/hourly_sync.yml` para reflejar cron diario.
- [ ] (Opcional) Agregar `.eslintrc` minimo si se desea usar `npm run lint` con reglas basicas.

## Criterios de validacion
- `npm run dev` y `npm run build` sin cambios visuales ni de datos.
- Comparar numero de tarjetas, etiquetas y valores con la version actual.
- `public/data/bcch_series.json` sigue siendo la fuente principal.

## Orden sugerido de ejecucion
1) Paso 1
2) Paso 2
3) Paso 3
4) Paso 4
5) Paso 5
