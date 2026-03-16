# Chileconomics - LLM Context (internal)

## What this repo does
Chileconomics is a single-page macro dashboard for Chile. It renders a scrollytelling layout with an overview (PIB composition + key indicators), a regional analysis section (map + PIB + population + labor), and a blog section with a dedicated long-form post.

## Quick start
- `npm install`
- `pip install -r requirements.txt`
- Create `.env` with `BCCH_USER` and `BCCH_PASSWORD`
- `npm run sync-data` (generates `public/data/bcch_series.json`)
- `npm run dev`

## Entry points
- `index.html` -> `src/main.jsx`
- `src/main.jsx` picks `App` vs blog post by pathname
- `src/app/App.jsx` is the main shell and section router

## Data pipeline (BCCH)
- Source: Banco Central de Chile API via `bcchapi`
- Sync: `sync_bcch_data.py` uses `SERIES_CONFIG_SYNC` from `bcch_shared.py` and writes `public/data/bcch_series.json`
- Automation: `.github/workflows/hourly_sync.yml` runs daily, commits JSON
- Frontend load: `src/data/bcch/api.js` loads `/data/bcch_series.json`, normalizes, caches, and derives data
- Aggregation: `src/data/bcch/useBcchData.js` composes overview + regional data and statistics
- Production: serverless endpoints in `api/` are blocked in prod; frontend should only use static JSON

## Key series IDs (core)
- PIB real nacional: `F032.PIB.FLU.R.CLP.EP18.Z.Z.0.T`
- PIB nominal nacional: `F032.PIB.FLU.N.CLP.EP18.Z.Z.0.T`
- IPC index: `F074.IPC.IND.Z.EP23.C.M` and `G073.IPC.IND.2023.M`
- Dolar observado: `F073.TCO.PRE.Z.D`
- Cobre: `F019.PPB.PRE.100.D`
- Desempleo nacional: `F049.DES.TAS.INE9.10.M`
- PIB regional: `F035.PIB.FLU.R.CLP.2018.Z.Z.Z.<code>.0.T`
- Poblacion regional: `F049.POB<code>.STO.INE.AT.A`
- Labor regional: `F049.FTR/OCU/DES.*` (see `SERIES_KEY_MAP`)

## Derived logic and invariants
- YoY inflation uses 12-month lag in `api.js`
- PIB component shares are from nominal series; imports are negative
- Government series may be residual if direct series is missing
- `computeSeriesStatsAtDate` uses lag=4 for quarterly YoY
- `REGION_ID_BY_NAME` maps TopoJSON names to regional IDs

## Current module map (src)
- `src/app/` app shell, navigation, theme state
- `src/features/overview/` overview section + PIB chart + indicator modals
- `src/features/regional/` map, regional PIB, population, labor
- `src/features/blog/` blog list
- `src/features/blog-posts/` long-form post UI
- `src/data/bcch/` data loading + hooks
- `src/shared/` shared UI components, utils, constants
- `src/styles/` global and modal styles

## Styling
- Global styles in `src/styles/global.css`
- Theme tokens in `src/styles/variables.css`
- Theme switches via `data-theme` attribute on `document.documentElement`

## Common changes
- Add a new BCCH series: update `SERIES_CONFIG_SYNC` in `bcch_shared.py`, run `npm run sync-data`, and add a key in `SERIES_KEY_MAP` inside `src/data/bcch/api.js` if the frontend needs it.
- Add a new section: create a new folder under `src/features/` and wire it in `src/app/App.jsx` + `TopNav` (if needed).

## Do not
- Do not edit `public/data/bcch_series.json` by hand.
- Do not ship BCCH credentials to the client.
