# Estructura del proyecto (simple y precisa)

## En una frase
Chileconomics es un dashboard macroeconomico de Chile con secciones de datos, un analisis regional y un blog, todo en una sola pagina con un post largo aparte.

## Carpetas principales
- `src/app/`: shell de la app, navegacion, tema y enrutado interno por seccion.
- `src/features/overview/`: vista principal de datos (PIB, indicadores, modales).
- `src/features/regional/`: mapa, PIB regional, poblacion y empleo.
- `src/features/blog/`: listado de articulos.
- `src/features/blog-posts/`: paginas largas de blog (hoy: precio como coordinador).
- `src/data/bcch/`: carga de datos BCCH y hooks de estado.
- `src/shared/`: componentes y utilidades reutilizables.
- `src/styles/`: estilos globales y modales.
- `public/data/`: JSON generado con series del Banco Central.
- `api/`: endpoints serverless para desarrollo (bloqueados en produccion).

## Flujo de datos (simplificado)
1) `sync_bcch_data.py` descarga series del Banco Central usando `BCCH_USER` y `BCCH_PASSWORD`.
2) Escribe `public/data/bcch_series.json` con todas las series y su ultimo dato.
3) El frontend lee ese JSON con `src/data/bcch/api.js` y lo transforma.
4) `src/data/bcch/useBcchData.js` entrega los datos listos a la UI.

## Donde tocar segun tarea
- Cambios de layout general o secciones: `src/app/App.jsx`.
- PIB e indicadores: `src/features/overview/`.
- Mapa y region: `src/features/regional/`.
- Blog listado: `src/features/blog/`.
- Post largo: `src/features/blog-posts/BlogPostPriceCoordinator.jsx`.
- Formato de fechas/numeros: `src/shared/utils/format.js`.
- Series y calculos: `src/shared/utils/series.js`.
- Mapeo de regiones: `src/shared/constants/regions.js`.
- Estilos globales: `src/styles/global.css` y `src/styles/variables.css`.

## Comandos utiles
- `npm run dev` inicia el sitio.
- `npm run sync-data` descarga datos del BCCH.
- `npm run build` genera el build de produccion.
- `npm run lint` revisa estilo y errores.

## Notas importantes
- `public/data/bcch_series.json` se genera automaticamente; no editar a mano.
- En produccion se usan datos estaticos; los endpoints de `api/` se bloquean.
