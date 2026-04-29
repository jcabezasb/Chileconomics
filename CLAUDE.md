# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChilEconomics is a macroeconomic dashboard for Chile that displays official data from the Central Bank of Chile (BCCH). Built as a scrollytelling one-pager, it presents economic indicators hierarchically: overview, GDP composition, labor market, prices, and external sector.

**Key Context**: The project owner is an economist learning development through this project. The codebase is "vibe-coded" — functional but built with limited coding experience. Economic concepts are well understood; technical implementation may need refinement.

**Live site**: https://chileconomics.cl/

## Architecture

### Data Flow (Critical Understanding)

1. **Data Source**: Python script (`sync_bcch_data.py`) fetches time series from BCCH API using credentials stored in `.env` (BCCH_USER, BCCH_PASSWORD)
2. **Static Data**: Script writes to `public/data/bcch_series.json` — this is the single source of truth for the frontend
3. **Automation**: GitHub Actions workflow (`.github/workflows/hourly_sync.yml`) runs daily, fetching fresh data and committing updates
4. **Frontend Consumption**: React app reads the static JSON file; no runtime API calls in production
5. **Development Proxy**: `api/` folder contains Vercel serverless functions blocked in production — used only for local development

**Important**: `public/data/bcch_series.json` is auto-generated. Never edit manually. The JSON structure:
```json
{
  "last_update": "YYYY-MM-DD HH:MM:SS",
  "series": {
    "series_key": {
      "data": [{"date": "YYYY-MM-DD", "value": 123.45}, ...],
      "latest": {"date": "YYYY-MM-DD", "value": 123.45}
    }
  }
}
```

### Series Configuration

All BCCH series IDs and metadata live in `bcch_shared.py` under `SERIES_CONFIG_SYNC`. This is the single registry for:
- National GDP (real/nominal)
- GDP components (consumption, investment, government, exports, imports)
- Regional GDP for all 16 Chilean regions
- Price indices (IPC general, core, volatile)
- Exchange rates (USD, EUR, CNY, ARS, JPY)
- Labor market data (unemployment, workforce, occupied by region)
- Population data (national and regional, by gender)
- Activity indices (IMACEC and components)
- Commodity prices (copper)

**Adding a new series**: Add entry to `SERIES_CONFIG_SYNC` in `bcch_shared.py`, then run `npm run sync-data`.

### Frontend Stack

- **Framework**: React 18 + Vite
- **Charts**: Recharts (line/bar charts), react-simple-maps (Chile regional map)
- **Styling**: Global CSS with CSS variables for theming (`src/styles/`)
- **State**: React hooks; `useBcchData` custom hook centralizes all data loading and transformation
- **Deployment**: Vercel with security headers configured in `vercel.json`

## Development Commands

```bash
# Install dependencies (both frontend and Python)
npm install
pip install -r requirements.txt

# Configure credentials (create .env file)
# BCCH_USER=your_username
# BCCH_PASSWORD=your_password

# Sync data from BCCH API (downloads all series)
npm run sync-data

# Development server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Lint code
npm run lint
```

## Code Organization

```
src/
├── app/              # Shell components (header, nav, routing logic)
├── features/         # Domain sections (overview, regional, blog, contact, development)
│   ├── overview/     # Main indicators, GDP modals, PIB composition
│   ├── regional/     # Interactive map and regional data
│   ├── blog/         # Blog post listing
│   └── blog-posts/   # Individual long-form posts (e.g., price coordinator)
├── data/bcch/        # BCCH data loading and transformation
│   ├── api.js        # Fetches and parses bcch_series.json
│   └── useBcchData.js # React hook - transforms raw data for UI consumption
├── shared/
│   ├── components/   # Reusable UI (DataTableModal, TrendChart, PlaceholderSection)
│   ├── utils/        # Pure functions (format, series calculations, sparkline generation)
│   └── constants/    # Static data (regions metadata with codes, names, coordinates)
└── styles/           # Global CSS and modal-specific styles
```

### Key Files

- **`src/app/App.jsx`**: Main application component, section routing, global state management
- **`src/data/bcch/useBcchData.js`**: Central hook that loads JSON, derives indicators, handles date selection
- **`src/shared/utils/series.js`**: Series math (YoY growth, moving averages, residual calculations)
- **`src/shared/utils/format.js`**: Number/date formatting (Chilean locale conventions)
- **`src/shared/constants/regions.js`**: Regional metadata mapping (ISO codes, names, centroid coordinates for map)
- **`bcch_shared.py`**: Python module with series config and DataFrame normalization

## Technical Decisions

### Why Static JSON Instead of Runtime API?
- BCCH API requires credentials (user/password)
- Avoids exposing credentials in frontend
- Data updates daily; real-time fetching unnecessary
- Improves frontend performance (no API latency)
- Simplifies deployment (static hosting on Vercel)

### GDP Composition Calculation
The frontend merges Investment (FBKF) and Inventory Changes (Existencias) because inventory changes are volatile and small. See `mergeInvestmentSeries` in `src/shared/utils/series.js`.

Government spending series has data gaps; when missing, it's calculated as a residual: `Government = PIB - (Consumption + Investment + Exports - Imports)`. See `buildGovernmentResidualSeries`.

### Regional Data
Chile has 16 regions. Regional codes in BCCH API don't match standard ISO codes. Mapping lives in `regions.js` with three code systems:
- `REGION_IDS`: Standardized keys (e.g., "RM", "I", "XV")
- `REGION_NUMERIC_CODE_BY_ID`: BCCH series codes for regional GDP
- `REGION_POB_CODE_BY_ID`: BCCH series codes for population

### Date Handling
- Most series are quarterly (PIB) or monthly (IPC, labor)
- Dates stored as `"YYYY-MM-DD"` strings in JSON
- Frontend allows period selection via date picker in overview section
- Selected date propagates through `useBcchData` hook to recompute stats at that point in time

## Common Tasks

**Add a new macroeconomic indicator:**
1. Find series ID in BCCH API documentation
2. Add to `SERIES_CONFIG_SYNC` in `bcch_shared.py`
3. Run `npm run sync-data` to fetch data
4. Add indicator display logic in `src/features/overview/OverviewSection.jsx`
5. Update `getKeyIndicators()` in `src/data/bcch/api.js` if needed

**Modify chart visualization:**
- Most charts use Recharts library
- Chart configs in respective feature components (e.g., `PIBComparisonChart.jsx`)
- Sparklines use custom SVG path generation (`src/shared/utils/sparkline.js`)

**Update regional map:**
- GeoJSON for Chile regions: `src/assets/chile.json`
- Map component: `src/features/regional/MacroMap.jsx`
- Uses react-simple-maps with D3 projections

**Change styling/theme:**
- CSS variables: `src/styles/variables.css`
- Global styles: `src/styles/global.css`
- Modal-specific: `src/styles/indicatorModal.css`, `src/styles/pibModal.css`

## Data Sync Workflow

The GitHub Actions workflow runs daily at midnight UTC:
1. Checkout repository
2. Install Python dependencies
3. Execute `sync_bcch_data.py` with secrets (BCCH_USER, BCCH_PASSWORD)
4. Commit `public/data/bcch_series.json` if changed
5. Push to main branch (triggers Vercel redeployment)

Manual sync: Run workflow from GitHub Actions UI or locally with `npm run sync-data`.

## Security Notes

- BCCH credentials stored as GitHub Secrets (BCCH_USER, BCCH_PASSWORD)
- Never commit `.env` file
- Production uses Content Security Policy headers (see `vercel.json`)
- API endpoints in `api/` folder are blocked in production via CSP

## Economics Context

The dashboard follows Central Bank reporting structure:
- **Overview**: Economic traffic light (growth, inflation, employment)
- **PIB**: GDP from expenditure approach (C + I + G + X - M)
- **Labor**: National unemployment rate and regional workforce data
- **Prices**: CPI decomposition (general, core, volatile components)
- **External**: Trade balance indicators (copper price, exchange rates)

When modifying economic calculations or adding indicators, consult Chilean Central Bank methodology documents (Cuentas Nacionales, IPC methodology, etc.).
