# Chileconomics - LLM Context (COMPLETO)

## ¿Qué es?

Dashboard macroeconómico de Chile de una sola página (scrollytelling). Muestra indicadores oficiales del Banco Central de Chile (BCCH): overview, composición PIB, mercado laboral, precios, y sector externo.

**Live site**: https://chileconomics.cl/

---

## Stack Tecnológico

- **Frontend**: React 18.2.0 + React DOM 18.2.0
- **Build**: Vite 5.1.4
- **Charts**: Recharts 2.12.0
- **Maps**: react-simple-maps 3.0.0
- **Icons**: lucide-react 0.330.0
- **Analytics**: @vercel/analytics 1.6.1, @vercel/speed-insights 1.3.1
- **Python**: bcchapi (para sync), pandas, python-dotenv
- **Deploy**: Vercel (static hosting)

---

## Quick Start

```bash
# Instalar todo
npm install
pip install -r requirements.txt

# Configurar credenciales (crear .env)
BCCH_USER=tu_usuario
BCCH_PASSWORD=tu_password

# Sync data (genera public/data/bcch_series.json)
npm run sync-data

# Dev server
npm run dev
```

---

## Comandos Disponibles

| Comando | Description |
|---------|-------------|
| `npm run dev` | Dev server en http://localhost:5173 |
| `npm run build` | Build a producción (输出 a `dist/`) |
| `npm run preview` | Preview del build |
| `npm run lint` | ESLint check |
| `npm run sync-data` | Fetch data de BCCH API → JSON |
| `python sync_bcch_data.py` | Equivalent (directo) |

---

## Estructura de Archivos

```
chileconomics/
├── public/data/
│   └── bcch_series.json          # JSON estático (SINGLE SOURCE OF TRUTH)
├── src/
│   ├── main.jsx                  # Entry point - routing basado en pathname
│   ├── app/
│   │   ├── App.jsx               # Shell principal + router de secciones
│   │   └── shell/
│   │       ├── HeroHeader.jsx
│   │       ├── LandingRibbons.jsx
│   │       └── TopNav.jsx
│   ├── features/
│   │   ├── overview/
│   │   │   ├── OverviewSection.jsx    # Overview indicators
│   │   │   ├── PibCompositionSection.jsx
│   │   │   ├── PIBComparisonChart.jsx
│   │   │   ├── PibModal.jsx
│   │   │   ├── IndicatorModal.jsx
│   │   │   ├── MacroCard.jsx
│   │   │   └── CompactIndicator.jsx
│   │   ├── regional/
│   │   │   ├── RegionalSection.jsx
│   │   │   └── MacroMap.jsx            # react-simple-maps
│   │   ├── blog/
│   │   │   └── BlogSection.jsx
│   │   ├── blog-posts/
│   │   │   └── BlogPostPriceCoordinator.jsx
│   │   ├── contact/
│   │   │   └── ContactSection.jsx
│   │   └── development/
│   │       └── DevelopmentSection.jsx
│   ├── data/bcch/
│   │   ├── api.js                 # Carga JSON, normaliza, mapea series
│   │   └── useBcchData.js         # Hook principal - transforma datos
│   ├── shared/
│   │   ├── components/
│   │   │   ├── DataTableModal.jsx
│   │   │   ├── TrendChart.jsx      # Recharts wrapper
│   │   │   └── PlaceholderSection.jsx
│   │   ├── utils/
│   │   │   ├── series.js          # math: computeSeriesStatsAtDate, mergeInvestmentSeries
│   │   │   ├── format.js          # formateo: formatNumber, formatMonthLabelSpace
│   │   │   └── sparkline.js       # SVG sparklines
│   │   └── constants/
│   │       └── regions.js         # Mapeo de regiones
│   └── styles/
│       ├── global.css
│       ├── variables.css           # CSS custom properties
│       ├── indicatorModal.css
│       └── pibModal.css
├── bcch_shared.py                 # Config de series + normalize_dataframe
├── sync_bcch_data.py             # Script de sync
├── sync_bcch_data.py
├── package.json
├── vite.config.js
├── vercel.json                   # Rewrites + CSP headers
├── requirements.txt
└── .github/workflows/
    └── hourly_sync.yml          # Daily sync automation
```

---

## Data Pipeline (CRÍTICO)

```
BCCH API ──(sync_bcch_data.py)──> bcch_series.json ──(api.js)──> React UI
         │                                      │
         │                    loadBcchData() ──│
         │                    fetch('/data/bcch_series.json')
         └── GitHub Actions daily (hourly_sync.yml)
```

### Paso a paso:

1. **Sync**: `sync_bcch_data.py` usa `bcchapi.Siete` para fetch con credenciales
2. **Output**: Escribe `public/data/bcch_series.json`
3. **Automation**: GitHub Actions corre daily a medianoche UTC
4. **Frontend**: `api.js` → `loadBcchData()` → `fetch()` del JSON estático
5. **Prod**: NO hay llamadas API - CSP bloquea todo

### Estructura del JSON:

```json
{
  "last_update": "2024-02-15 10:30:00",
  "series": {
    "pib_real": {
      "data": [
        {"date": "2020-01-01", "value": 12345.67},
        ...
      ],
      "latest": {"date": "2024-01-01", "value": 51880.0}
    },
    ...
  }
}
```

---

## Routing (URL-based)

El routing es manual via `window.location.pathname` en `main.jsx`:

| URL | Componente |
|-----|------------|
| `/` | Landing (HeroHeader + LandingRibbons) |
| `/datos` | OverviewSection + RegionalSection + PibCompositionSection |
| `/blog` | BlogSection |
| `/blog/el-precio-como-coordinador` | BlogPostPriceCoordinator |
| `/contacto` | ContactSection |
| `/desarrollo` | DevelopmentSection |
| `/videos` | PlaceholderSection (próximamente) |

### Código del routing (`src/main.jsx`):

```jsx
const Root = () => {
    const path = window.location.pathname
    if (path === '/blog/el-precio-como-coordinador') {
        return <BlogPostPriceCoordinator />
    }
    return <App />
}
```

---

## Series Keys (BCCH → Frontend)

### Mapeo completo en `src/data/bcch/api.js` (líneas 397-547):

### Nacional - PIB
| BCCH ID | Key | Descripción |
|--------|-----|-------------|
| `F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T` | `pib_real` | PIB Real |
| `F032.PIB.FLU.N.CLP.EP18.Z.Z.0.T` | `pib_nominal` | PIB Nominal |
| `F033.CPR.FLU.N.CLP.EP18.0.T` | `consumo_privado` | Consumo Privado |
| `F033.COG.FLU.N.CLP.EP18.0.T` | `gasto_gob_nominal` | Gasto Gobierno |
| `F033.FKF.FLU.N.CLP.EP18.0.T` | `fbkf_nominal` | FBKF (Inversión) |
| `F033.VAX.FLU.N.CLP.EP18.0.T` | `existencias_nominal` | Existencias |
| `F033.XBS.FLU.N.CLP.EP18.0.T` | `export_nominal` | Exportaciones |
| `F033.IBS.FLU.N.CLP.EP18.0.T` | `import_nominal` | Importaciones |

### Precios y Tipo de Cambio
| BCCH ID | Key |
|--------|-----|
| `F074.IPC.IND.Z.EP23.C.M` | `ipc_index` |
| `G073.IPC.IND.2023.M` | `ipc_general` |
| `G073.IPCSV.IND.2023.M` | `ipc_core` |
| `G073.IPCV.IND.2023.M` | `ipc_volatile` |
| `F073.TCO.PRE.Z.D` | `dolar` |
| `F073.TCR.IND.199101.M` | `tcr` |
| `F073.TR5.IND.198601.M` | `tcr_5` |
| `F072.CLP.CNY.N.O.D` | `tc_cny` |
| `F072.CLP.EUR.N.O.D` | `tc_eur` |
| `F072.CLP.ARS.N.O.D` | `tc_ars` |
| `F072.CLP.JPY.N.O.D` | `tc_jpy` |

### Actividad Económica
| BCCH ID | Key |
|--------|-----|
| `F032.IMC.IND.Z.Z.EP18.Z.Z.0.M` | `imacec` |
| `F032.IMC.IND.Z.Z.EP18.PB.Z.0.M` | `imacec_bienes` |
| `F032.IMC.IND.Z.Z.EP18.03.Z.0.M` | `imacec_mineria` |
| `F032.IMC.IND.Z.Z.EP18.04.Z.0.M` | `imacec_industria` |
| `F032.IMC.IND.Z.Z.EP18.RB.Z.0.M` | `imacec_resto_bienes` |
| `F032.IMC.IND.Z.Z.EP18.COM.Z.0.M` | `imacec_comercio` |
| `F032.IMC.IND.Z.Z.EP18.SERV.Z.0.M` | `imacec_servicios` |
| `F032.IMC.IND.Z.Z.EP18.N03.Z.0.M` | `imacec_no_minero` |

### Laboral
| BCCH ID | Key |
|--------|-----|
| `F049.DES.TAS.INE9.10.M` | `desempleo` |

### Commodities
| BCCH ID | Key |
|--------|-----|
| `F019.PPB.PRE.100.D` | `cobre` |

### PIB Regional (16)
| Key | Regions |
|-----|---------|
| `pib_reg_XV` | Arica y Parinacota |
| `pib_reg_I` | Tarapacá |
| ... | ... |
| `pib_reg_RM` | Metropolitana |

### Población Nacional
| BCCH ID | Key |
|--------|-----|
| `F049.POB.STO.INE1.01.A` | `pob_total` |
| `F049.POB.STO.INE1.02.A` | `pob_hombres` |
| `F049.POB.STO.INE1.03.A` | `pob_mujeres` |

### Laboral Regional
- Keys: `labor_ftr_reg_{id}`, `labor_ocu_reg_{id}`, `labor_des_reg_{id}`

---

## Regiones - Codes (CRÍTICO)

Chile tiene 16 regiones con códigos INCONSISTENTES entre sistemas:

En `src/shared/constants/regions.js`:

```javascript
export const REGION_ID_BY_NAME = {
    'Arica y Parinacota': 'XV',
    'Tarapacá': 'I',
    'Antofagasta': 'II',
    // ...
    'Región Metropolitana de Santiago': 'RM',
    // ...
};

export const REGION_NUMERIC_CODE_BY_ID = {
    XV: '15',  // para PIB regional
    I: '01',
    RM: '13',
    // ...
};

export const REGION_POB_CODE_BY_ID = {
    XV: 'AP',  // para población
    I: 'TA',
    RM: 'RM',
    // ...
};

export const REGION_IDS = ['XV', 'I', 'II', 'III', 'IV', 'V', 'RM', 'VI', 'VII', 'XVI', 'VIII', 'IX', 'XIV', 'X', 'XI', 'XII'];
```

---

## Hooks y Utils Importantes

### `useBcchData` (src/data/bcch/useBcchData.js)

Hook principal que carga y transforma todos los datos:

```javascript
const {
    indicators,          // [{id, title, value, variation, trend, period, description}]
    loading,
    latestPib,          // {date, value, variation, history}
    latestDolar,
    latestIpc,
    regionalData,        // {XV: {pib, pob, labor}, I: {...}, ...}
    compositionStats,    // {consumo, gasto, export, import, inversion, total}
    pibCompositionData,  // {total, consumo, inversion, gasto, export, import}
    populationData,       // {total, hombres, mujeres}
    realPibData,
    nominalSeries,
    availablePeriods     // [{date, year, quarter}]
} = useBcchData(selectedDate);
```

#### Qué carga este hook:

1. **KB indicators** via `getKeyIndicators()` → IPC, dólar, cobre, desempleo
2. **PIB series** nominal (para composición)
3. **PIB real** nacional
4. **Población** nacional
5. **PIB regional** + población + laboral para las 16 regiones
6. **Componentes IMACEC**

### Funciones en `src/shared/utils/series.js`:

```javascript
// Normaliza series, filtra nulls/undefined
normalizeSeries(series)

//计算 Year-over-Year stats
computeSeriesStatsAtDate(series, targetDate, {lag: 4, historyPoints: 4})
// Retorna: {value, variation, history, trend, date}

// Merge FBKF + Existencias = Inversión total
mergeInvestmentSeries(fbkfSeries, existenciasSeries)

// Calcula gasto gobierno como residual si no hay data
buildGovernmentResidualSeries(pibSeries, consumoSeries, inversionSeries, exportSeries, importSeries)
```

### Funciones en `src/shared/utils/format.js`:

```javascript
// Number formatting (locale es-CL)
formatNumber(value, decimals)  // "51.880" → "51.880"

// Date formatting
formatMonthLabelSpace("2024-03-15")  // "mar 2024"
formatMonthLabelDash("2024-03-15")    // "mar-2024"
formatDayLabel("2024-03-15")         // "15-mar"
formatQuarterLabel("2024-03-15")     // "T1-2024"
```

---

## Decisiones Técnicas

### PIB Composición

- **Inversión**: FBKF + Existencias (se merging en `mergeInvestmentSeries`)
- **Gobierno**: Si no hay data directa, se calcula como residual:
  ```
  Gobierno = PIB - Consumo - Inversión - Export + Import
  ```

### Year-over-Year Calculation

- **Monthly series**: `lag = 12`
- **Quarterly series**: `lag = 4`
- Función: `buildYoYFromIndex(series, lag)` en `api.js`

### Theme

- Toggle via `data-theme` attribute en `documentElement`
- Valores: `'light'` | `'dark'`
- Persistido en `localStorage.getItem('theme')`
- Default: system preference (`prefers-color-scheme`)

### Fallback Behavior

```javascript
// En api.js línea 93-94
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const ALLOW_API_FALLBACK = import.meta.env.DEV;

// Solo intenta API calls en dev (import.meta.env.DEV === true)
// Production siempre usa JSON estático
// Si JSON no existe, usa mocks hardcodeados
```

---

## CSP y Security (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; img-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; ..."
        }
      ]
    }
  ]
}
```

**Importante**: `connect-src 'self'` bloquea cualquier fetch a APIs externas en producción.

---

## GitHub Workflow (.github/workflows/hourly_sync.yml)

```yaml
name: Daily Data Sync

on:
  schedule:
    - cron: '0 0 * * *'  # Medianoche UTC daily
  workflow_dispatch:       # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      - run: pip install -r requirements.txt
      - run: python sync_bcch_data.py
        env:
          BCCH_USER: ${{ secrets.BCCH_USER }}
          BCCH_PASSWORD: ${{ secrets.BCCH_PASSWORD }}
      - run: |
          git add public/data/bcch_series.json
          git diff --quiet && git diff --staged --quiet || \
            (git commit -m "data: daily update" && git push)
```

---

## Añadir Nueva Serie

1. **Python config**: Agregar en `bcch_shared.py` → `SERIES_CONFIG_SYNC`:
   ```python
   "mi_serie": {"id": "F000.XXX.YYY", "name": "Mi Serie", "frequency": "M"}
   ```

2. **Sync**: `npm run sync-data`

3. **Frontend mapping**: Si la key no coincide con BCCH ID, agregar en `SERIES_KEY_MAP` en `api.js`:
   ```javascript
   'F000.XXX.YYY': 'mi_serie'
   ```

4. **Usar**: En componente via hook `useBcchData` o `getSeries('F000.XXX.YYY')`

---

## Cosas a EVITAR

1. **NO editar** `public/data/bcch_series.json` a mano
2. **NO exposar** credenciales BCCH en frontend
3. **NO hacer fetch** a APIs en prod (viola CSP)
4. **NO usar** `VITE_API_BASE_URL` - no es necesario (solo para dev proxy)

---

## key Files para Referencia

| Archivo | Propósito |
|---------|-----------|
| `src/data/bcch/api.js` | Carga JSON, mapea series, calcula YoY |
| `src/data/bcch/useBcchData.js` | Hook principal |
| `src/shared/utils/series.js` | Math: stats, merge, residual |
| `src/shared/utils/format.js` | Number/date formatting |
| `src/shared/constants/regions.js` | Region codes mapping |
| `bcch_shared.py` | Series config + normalize_dataframe |
| `sync_bcch_data.py` | Script de sync |
| `vercel.json` | CSP headers, rewrites |