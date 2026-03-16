# Plan de optimizaciones (sin cambios funcionales)

Este documento organiza las mejoras detectadas para Chileconomics en pasos ejecutables y medibles. El objetivo es optimizar rendimiento, bundle y mantenimiento sin alterar la funcionalidad visible.

## 0) Baseline (medir antes de cambiar)
- Medir peso de `public/data/bcch_series.json` y tiempo de descarga/parsing en el navegador.
- Contar cantidad de `fetch` a datos en el primer render y tiempo de carga en `App`.
- Registrar bundle size (Vite build) para comparar despues.

## 1) Datos: cache y parsing unico
**Objetivo:** evitar fetch/parse duplicado del JSON estatico y reducir costos de CPU.

- `src/data/bcch/api.js`: cachear promesa de `loadBcchData` para que llamadas concurrentes compartan el mismo fetch.
- `src/data/bcch/api.js`: normalizar el payload una sola vez y reutilizar `bcchDataCache`.
- `src/data/bcch/api.js`: cachear resultados derivados (ej. `getChartData`) por `indicatorId`.
- Opcional: agregar `latest` en el JSON generado por `sync_bcch_data.py` para evitar recorrer series en el cliente.

## 2) UI: reducir rerenders y recomputos
**Objetivo:** minimizar trabajo por render sin cambiar la salida.

- `src/app/App.jsx`: mover constantes puras fuera del componente (p. ej. mapas de regiones y arrays de opciones).
- `src/app/App.jsx`: `useMemo` para datos derivados pesados (sideIndicators, charts, laborCards, ranges).
- `src/features/regional/MacroMap.jsx`: `React.memo` si props no cambian frecuentemente.
- `src/features/overview/MacroCard.jsx`: `React.memo` + evitar recalcular formatters en cada render.
- `src/shared/components/TrendChart.jsx`: `React.memo` y memoizar calculos de dominio/average si `data` no cambia.

## 3) Bundle: eliminar dependencias y codigo sin uso
**Objetivo:** reducir tamaño de bundle y tiempo de parseo.

- `package.json`: quitar `clsx` si no se usa (no hay referencias en `src/`).
- `package.json`: quitar `d3-scale` si solo se usa `scaleLinear` sin efecto (hoy no se usa en `MacroMap`).
- Revisar `d3-zoom` (no hay uso directo). Si no lo requiere `react-simple-maps`, remover.
- `src/features/regional/MacroMap.jsx`: eliminar `colorScale` sin uso.

## 4) CSS y fuentes
**Objetivo:** reducir bloqueos de render y duplicaciones.

- `src/app/App.jsx`: quitar import duplicado de `./styles/global.css` (ya se importa en `src/main.jsx`).
- `index.html`: mover `@import` de Google Fonts desde `src/styles/global.css` a `<link rel="preconnect">` + `<link rel="stylesheet">`.

## 5) Datos: tamano del JSON estatico
**Objetivo:** reducir peso de red sin cambiar datos.

- `sync_bcch_data.py`: usar JSON compacto para produccion (sin `indent`) o generar version comprimida.
- Mantener orden/estructura para no romper el consumidor.

## 6) Seguridad y fallback
**Objetivo:** alinear con `SECURITY_PLAN.md` sin cambiar UI.

- `src/data/bcch/api.js`: asegurar que los fallbacks `/api/*` solo se usen en desarrollo.
- Validar que en produccion el frontend solo lea `public/data/bcch_series.json`.

## 7) Validacion
- Verificar que no cambia el render visual (comparar antes/despues con capturas).
- Comparar tiempos de carga y bundle size con el baseline.

---

### Orden sugerido de ejecucion
1. Paso 1 (cache/parsing) + Paso 3 (deps sin uso) por impacto inmediato.
2. Paso 2 (memoizacion/rerenders) para estabilidad en UI.
3. Paso 4 (fuentes/CSS) para mejorar FCP.
4. Paso 5 (JSON compacto) si el peso es alto.
5. Paso 6 (fallback prod) para seguridad.

### Notas
- Todas las acciones anteriores no cambian funcionalidades ni output esperado.
- Cualquier cambio debe ir acompañado de medicion antes/despues.
