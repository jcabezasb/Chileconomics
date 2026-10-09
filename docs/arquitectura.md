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
| `features/datos/` | `DatosPage`: arma la página /datos con las tres secciones |
| `features/overview/` | Tarjetas de indicadores (`IndicatorCard`) y vista de detalle (`detail/`): gráfico principal, selector de fechas y un desglose por indicador (`detail/breakdowns/`) |
| `features/regional/` | Mapa y fichas regionales. `useRegionalView` concentra los cálculos; los componentes solo dibujan |
| `features/pib/` | Composición del PIB por el lado del gasto (`usePibComposition`) |
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
- **Correlación cobre–dólar** (`shared/utils/correlation.js`): Pearson sobre variaciones semanales.
  Semanales porque el dólar observado de cada día se calcula con transacciones del día anterior,
  lo que hace que la comparación diaria subestime la relación.
- **Tablas** (`shared/utils/tableData.js`): las variaciones se calculan con la serie completa y luego
  se muestran solo las filas del rango elegido (así la primera fila también tiene su variación anual).
  Al agrupar se usa el promedio del período, salvo flujos como el PIB, que se suman. En tasas (IPC,
  desempleo) las variaciones van en puntos porcentuales. Solo se dibujan las filas visibles.
- **Gráficos largos** (`shared/utils/downsample.js`): con más de 600 puntos se dibujan con LTTB, que
  conserva peaks y caídas. Tablas, CSV y estadísticas usan siempre la serie completa.

## Estilos

`src/styles/global.css` solo importa las partes en orden (el orden importa para la cascada).
Los colores y sombras son variables de `variables.css` con versión clara y oscura
(`[data-theme="light"]` / `[data-theme="dark"]` en `<html>`). Las ventanas y tablas tienen su
propia hoja, importada por el componente que la usa.
