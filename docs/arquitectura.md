# Arquitectura

## Flujo de datos

```
API Banco Central ──(python/sync_bcch_data.py, diario)──> public/data/bcch_series.json
                                                                   │
                                          src/data/bcch/client.js ─┘ (una sola descarga, en caché)
                                                   │
                     ┌─────────────────────────────┼──────────────────────────────┐
              indicators.js                  useBcchData.js                 componentes
       (tarjetas, series de detalle)   (regiones, PIB, población)     (piden series por clave)
```

- **`python/bcch_shared.py`** es el registro de series: cada clave (`dolar`, `pib_reg_RM`, ...) apunta
  a un código del Banco Central. Las series regionales se generan desde la tabla `REGIONS`.
- **`python/sync_bcch_data.py`** descarga todo y escribe el JSON. Si una serie falla conserva la
  versión anterior; si fallan más del 20% no escribe nada y termina con error (así el sitio nunca
  publica datos incompletos).
- **`src/data/bcch/seriesKeys.js`** lista las mismas claves del lado del frontend. Una prueba
  (`dataContract.test.js`) verifica que todas existan en el JSON.
- **`python/import_dipres.py`** lee el Excel trimestral de la DIPRES (hojas `Total` e `IngTrib`) y
  escribe `public/data/finanzas_publicas.json`: el árbol de partidas (`tree`) y una serie mensual
  por partida, en millones de pesos, desde `start` hasta `last_period`. Corre en la sincronización
  diaria: busca en la página de la DIPRES el Excel más reciente (el primero de la lista) y lo importa.
- **`python/import_mercados_eeuu.py`** escribe `public/data/mercados_eeuu.json` con tasas y precios
  de EE.UU. desde 2015: curva del Tesoro (1, 2, 3, 5 y 10 años) y curva real TIPS (5 y 10), tasa efectiva
  y rango meta de la Fed (NY Fed, desde 2016) y, vía FRED, el índice amplio del dólar y el VIX. Mismo
  formato de series que `bcch_series.json`; `sources` guarda la fecha de revisión de cada fuente. Con
  historia guardada solo vuelve a bajar los dos últimos años.
- **Fecha de revisión**: los importadores guardan `checked_at` (día en que consultaron la fuente con
  éxito) en `finanzas_publicas.json`, `ied_paises.json` y en `ipom` y `weo` de `proyecciones.json`; en
  `bcch_series.json` es `last_update`. Si una fuente falla, queda la fecha anterior. La sección
  Fuentes muestra esa fecha junto al último dato de cada fuente.

Formato del JSON:

```json
{
  "last_update": "2026-10-09 00:03:11",
  "series": {
    "dolar": { "data": [{ "date": "2026-10-08", "value": 977.25 }] }
  }
}
```

Las fechas son texto `YYYY-MM-DD`. Las series mensuales y trimestrales vienen con día `01`.

## Frontend

| Carpeta | Contenido |
|---|---|
| `app/` | `App.jsx` (elige la vista según la URL), `routes.js`, hooks `useRoute`, `useTheme`, `useRevealOnScroll` y la navegación (`shell/`) |
| `features/datos/` | `DatosPage`: arma la página /datos. Un menú fijo arriba (`datosSections.js`) elige qué sección se muestra; la elegida queda en la URL (`/datos#proyecciones`, ver `useDatosSection`) y solo esa se monta |
| `features/mercados/` | Tasas y mercados: Chile vs. EE.UU. en los mismos plazos. Pestañas Tasas (curvas del día, tasas de política, diferencial a 2, 5 o 10 años), Tasas reales e inflación (bonos en UF vs. TIPS, compensación inflacionaria) y Monedas y materias primas. `mercadosView.js` (funciones puras) junta y resta series por fecha y las pasa a semanal; estado en `useMercadosView`. Los datos de EE.UU. vienen de `data/mercados/client.js`. El contenido entra con el efecto `ascii-reveal` (estilo dither) al cargar y al cambiar de pestaña, rango o plazo |
| `features/proyecciones/` | Proyecciones de crecimiento del PIB: Banco Central (EEE e IPoM) y FMI (WEO). `projectionsView.js` (funciones puras) arma las ediciones de cada fuente, el crecimiento efectivo y las dos vistas: `ProjectionsYearChart` (por año) y `ProjectionsRevisionChart` (cómo cambió lo proyectado para un año). Estado en `useProjectionsView` |
| `features/overview/` | Tarjetas de indicadores (`IndicatorCard`) y vista de detalle (`detail/`): gráfico principal, selector de fechas y un desglose por indicador (`detail/breakdowns/`) |
| `features/regional/` | Mapa y fichas regionales. `useRegionalView` concentra los cálculos; los componentes solo dibujan |
| `features/ied/` | Inversión extranjera directa. `IedFlowChart` dibuja globo, barra y mapa de Chile o lista de sectores (hacia Chile) o sectores, barra y globo (desde Chile); el globo va en un canvas (`GlobeCanvas`, más fluido que SVG al girar) y se gira con `useGlobeRotation`. `IedLinesChart` es la vista alternativa de líneas. `useIedView` carga las series por región y `ied_paises.json`, y maneja sentido, año y destacado. Geometría pura en `iedLayout.js`; países y su ubicación en `iedCountries.js` |
| `features/pib/` | Composición del PIB por el lado del gasto (`usePibComposition`) |
| `features/fiscal/` | Finanzas públicas: `useFiscalView` carga los datos de la DIPRES; `fiscalView.js` suma por período, calcula % del PIB y variación real; `FiscalTree` es la tabla desplegable |
| `features/fuentes/` | Fuentes: un botón por institución y una tabla con cada dato, la sección donde se usa, su frecuencia, el último dato y la fecha de revisión. `sourcesCatalog.js` es la lista fija; `sourcesView.js` (funciones puras) lee las fechas de los cuatro JSON |
| `features/blog*`, `contact/`, `development/` | Secciones de contenido |
| `shared/components/` | `TrendChart` (todos los gráficos de línea), `SeriesTable` (tablas de series de tiempo: agrupar por período, variaciones, ordenar, copiar), `DataTable` (tablas simples), `DataTableModal`, `controls` |
| `shared/utils/` | Funciones puras con pruebas: fechas, formato, estadísticas, per cápita, correlación, reducción de puntos |

Datos y gráficos se cargan solo al entrar a /datos (`React.lazy`), y las librerías grandes
(React, Recharts, el mapa) van en archivos separados para que el navegador las guarde en caché.

## Decisiones de cálculo

- **Variación en 12 meses** (`shared/utils/dates.js: buildYoYSeries`): se compara por fecha, no por
  posición. En series diarias, si el mismo día del año anterior no tuvo dato (fin de semana o
  feriado), se usa el último dato de hasta 7 días antes.
- **Rangos 1A/2A/5A** (`filterByRange`): se cuentan hacia atrás desde el último dato de cada serie.
- **Composición del PIB**: la inversión suma FBKF y variación de existencias; el gasto de gobierno
  se completa como residuo (PIB − C − I − X + M) cuando falta en la serie oficial.
- **PIB per cápita regional** (`shared/utils/perCapita.js`): suma de los últimos 4 trimestres de PIB
  regional (miles de millones, encadenado 2018) dividida por la población proyectada del INE para
  ese año. El promedio regional es la suma de las regiones (no el PIB nacional, porque parte del
  PIB no se asigna a ninguna región).
- **IED por país** (`python/import_ied_paises.py`): sale del Excel público "IED por país, sector y
  región" del Banco Central, hoja *País (Activo y Pasivo)*. Se usa el principio activo/pasivo porque
  su total coincide exacto con el de la serie por región (el direccional da otro total). El país es
  el del inversionista inmediato. Desde Chile no hay desglose por región, así que en ese sentido el
  mapa es un solo bloque.
- **IED por sector** (`python/import_ied_paises.py`, hoja *Sector (Activo y Pasivo)*): stock por sector
  económico en ambos sentidos, mismo total que por país. El Banco Central no cruza sector con país, así que
  son dos desgloses del mismo total: en el gráfico no hay cintas entre la columna de sectores y la de
  países, y los "no asignados" de cada desglose no coinciden. La lista de sectores reemplaza al mapa
  (siempre desde Chile; hacia Chile con el botón Regiones | Sectores). Nombre corto e ícono de cada sector
  en `features/ied/iedSectors.js`.
- **IED por región** (`features/ied/`): stock a fin de año en millones de US$, desde 2012. El Banco
  Central agrupa algunas regiones (por ejemplo, Ñuble, Biobío y La Araucanía) y publica una parte
  "no asignada" a ninguna región, que va en la barra pero sin cinta hacia el mapa. Las partes suman
  el total nacional. Cada cinta llega al mapa con el mismo grosor que su segmento de la barra (el
  ancho representa el monto), sin pasarse de la franja de su región.
- **Proyecciones** (`features/proyecciones/`, `python/import_proyecciones.py`): tres fuentes.
  La Encuesta de Expectativas Económicas viene de la API (una serie por año proyectado, claves
  `eee_pib_<año>`; antes de 2019 el código BDE no lleva el año, ver `EEE_PIB_OLD_CODES`). El IPoM
  sale del Excel "Proyecciones IPoM 2010-20xx" que el Banco Central publica con cada informe (el
  enlace se busca en la página del IPoM); sus rangos se guardan como [mín, máx] y el gráfico muestra
  el punto medio con el rango. El FMI sale de la API SDMX (`api.imf.org`; imf.org bloquea a GitHub
  Actions); la API solo trae unas pocas ediciones del WEO, así que el importador conserva las que ya
  tiene y el historial crece con cada edición nueva. El crecimiento efectivo se calcula con la suma
  de los cuatro trimestres del PIB real, solo para años completos.
- **Correlación cobre–dólar** (`shared/utils/correlation.js`): Pearson sobre variaciones semanales.
  Semanales porque el dólar observado de cada día se calcula con transacciones del día anterior,
  lo que hace que la comparación diaria subestime la relación.
- **Tablas** (`shared/utils/tableData.js`): las variaciones se calculan con la serie completa y luego
  se muestran solo las filas del rango elegido (así la primera fila también tiene su variación anual).
  Al agrupar se usa el promedio del período, salvo flujos como el PIB, que se suman. En tasas (IPC,
  desempleo) las variaciones van en puntos porcentuales. Solo se dibujan las filas visibles.
- **Finanzas públicas** (`features/fiscal/fiscalView.js`): los períodos son el año en curso acumulado
  y los años cerrados. El % del PIB usa el PIB nominal de los mismos trimestres. La variación real
  divide cada mes por su IPC y compara con los mismos meses del año anterior; no se informa cuando
  el monto cambia de signo (por ejemplo, un balance que pasa de déficit a superávit).
- **Gráficos largos** (`shared/utils/downsample.js`): con más de 600 puntos se dibujan con LTTB, que
  conserva peaks y caídas. Tablas, CSV y estadísticas usan siempre la serie completa.

## Estilos

`src/styles/global.css` solo importa las partes en orden (el orden importa para la cascada).
Los colores y sombras son variables de `variables.css` con versión clara y oscura
(`[data-theme="light"]` / `[data-theme="dark"]` en `<html>`). Las ventanas y tablas tienen su
propia hoja, importada por el componente que la usa.
