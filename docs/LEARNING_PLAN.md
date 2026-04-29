# ChilEconomics Learning Plan
**For: Understanding Your Own Project as a Developer**

This guide helps you progress from "vibe-coded it" to "I understand how it works" by exploring your codebase systematically.

---

## 🎯 Learning Objectives

By the end of this plan, you will understand:
1. How data flows from BCCH API to your users' browsers
2. How React components render your economic indicators
3. How the state management and data transformation works
4. How to debug issues and add new features confidently
5. How the deployment and automation pipeline functions

---

## 📚 Phase 1: The Data Foundation (Start Here)

**Goal**: Understand where your data comes from and how it's structured.

### Step 1.1: Examine the Raw Data
**Time**: 15 minutes

1. Open `public/data/bcch_series.json` in your editor
2. Look at the structure:
   - Top level: `last_update` and `series` object
   - Each series has: `data` array (historical points) and `latest` object
3. Find a series you know well (e.g., `pib_total` or `dolar`)
4. Notice the date format: `"YYYY-MM-DD"`
5. Notice how values are stored as numbers (not strings)

**Exercise**: Answer these questions:
- How many data points does the `dolar` series have?
- What's the latest PIB value and its date?
- Are there any series with `null` values in their history?

### Step 1.2: Trace Data Collection
**Time**: 20 minutes

1. Open `bcch_shared.py`
   - Find `SERIES_CONFIG_SYNC` dictionary (line 146)
   - This is your "menu" of all economic series
   - Each entry has: `id` (BCCH API code), `name`, `frequency`

2. Open `sync_bcch_data.py`
   - Read the `fetch_series()` function (line 16)
   - Read the `sync_data()` function (line 34)
   - Notice: it loops through SERIES_CONFIG and fetches each one

3. **Key Insight**: `bcch_shared.py` is the single source of truth for what data you collect

**Exercise**: 
- Find the series ID for "Tipo de cambio Euro" (Euro exchange rate)
- What frequency is the unemployment rate (`desempleo`) series?
- How would you add a new series for interest rates (TPM)?

### Step 1.3: Understand Automation
**Time**: 10 minutes

1. Open `.github/workflows/hourly_sync.yml`
2. See how it:
   - Runs daily at midnight UTC (line 5: `cron: '0 0 * * *'`)
   - Checks out your repo
   - Installs Python dependencies
   - Runs `sync_bcch_data.py`
   - Commits the updated JSON file

**Key Insight**: Your site updates automatically every day without you lifting a finger!

**Exercise**:
- When did the last automated sync run? (Check git log: `git log --oneline -5`)
- How would you trigger a manual sync from GitHub Actions UI?

---

## 📚 Phase 2: Frontend Data Loading

**Goal**: Understand how React loads and prepares the data for display.

### Step 2.1: The Data API Layer
**Time**: 25 minutes

1. Open `src/data/bcch/api.js`
2. Read `getSeries()` function:
   - Fetches `bcch_series.json` (the file you explored in Phase 1)
   - Parses it and returns the `series` object
3. Read `getKeyIndicators()` function:
   - Calls `getSeries()` to get all data
   - Extracts specific series (IPC, Dólar, Desempleo, Cobre)
   - Builds "indicator" objects with metadata for the UI

**Key Concept**: This file is the bridge between your static JSON and React components.

**Exercise**:
- In `getKeyIndicators()`, find where it gets the dollar exchange rate data
- What properties does each indicator object have? (hint: `id`, `label`, `value`, etc.)
- How does it determine if a value is going up or down? (look for `trend` calculation)

### Step 2.2: The Central Data Hook
**Time**: 30 minutes

1. Open `src/data/bcch/useBcchData.js`
2. This is complex but critical — it's the "brain" of your data layer
3. Notice the `useEffect` hooks:
   - First one (line 37): loads key indicators on mount
   - Others: recompute stats when `selectedDate` changes

4. Focus on these sections:
   - Lines 24-36: State variables (indicators, loading, regionalData, etc.)
   - Line 38: Fetching indicators from the API
   - Lines 44-90: Computing PIB composition stats at selected date
   - Lines 92-130: Loading regional PIB data for all 16 regions

**Key Insight**: This hook transforms raw time series into UI-ready statistics (growth rates, latest values, comparisons).

**Exercise**:
- What does `computeSeriesStatsAtDate()` do? (imported from `series.js`)
- Find where regional GDP data is loaded (hint: line 92+)
- Why does the hook have a `selectedDate` parameter?

### Step 2.3: Understanding Series Utilities
**Time**: 20 minutes

1. Open `src/shared/utils/series.js`
2. Key functions to understand:
   - `computeSeriesStatsAtDate()`: Gets value at a date, calculates YoY growth, builds history
   - `mergeInvestmentSeries()`: Combines FBKF + Existencias into single Investment series
   - `buildGovernmentResidualSeries()`: Calculates government spending when data is missing
   - `getTrendFromHistory()`: Determines if a series is trending up/down/stable

**These are pure functions** — they take data in, return transformed data out. No side effects.

**Exercise**:
- Why does `buildGovernmentResidualSeries` exist? (Hint: check the comment)
- What does YoY mean in `computeSeriesStatsAtDate`? (Year-over-Year)
- How does `getTrendFromHistory` decide between 'up', 'down', 'stable'?

---

## 📚 Phase 3: React Component Architecture

**Goal**: Understand how your UI is structured and how components communicate.

### Step 3.1: The App Shell
**Time**: 20 minutes

1. Open `src/app/App.jsx`
2. This is your main component — the "skeleton" of your site
3. Key sections:
   - Line 26: Constants for chart order, section paths, etc.
   - Lines 51-200+: Main `App` component function
   - Inside: Navigation state, data loading via `useBcchData`, scroll handling
   - JSX return (bottom): Structure of the entire page

4. Notice the pattern:
   ```jsx
   <OverviewSection 
     sectionRef={datosRef}
     theme={theme}
     chartIndicators={chartIndicators}
     imacecIndicator={imacecIndicator}
   />
   ```
   This is **passing props** — sending data from parent (App) to child (OverviewSection).

**Key Insight**: `App.jsx` is the orchestrator. It loads data and distributes it to sections.

**Exercise**:
- What sections does your site have? (Look for all `<...Section>` components)
- Where does `chartIndicators` come from? Trace it backwards.
- What happens when you click a nav link? (Look for `scrollToSection`)

### Step 3.2: The Overview Section
**Time**: 25 minutes

1. Open `src/features/overview/OverviewSection.jsx`
2. This is simpler than App — it just renders a grid of cards
3. Notice:
   - Props coming in: `chartIndicators`, `imacecIndicator`, `theme`
   - State: `activeIndicator` (for modal)
   - JSX: Grid layout with `MacroCard` components

4. Open `src/features/overview/MacroCard.jsx`
5. This component displays one indicator card:
   - Shows label, value, change percentage
   - Renders a sparkline (mini chart)
   - Has click handler to open modal

**Pattern Recognition**: 
- `OverviewSection` = container (layout)
- `MacroCard` = presentational (display one thing)

**Exercise**:
- What prop does `MacroCard` receive to know which indicator to display?
- Where is the sparkline SVG generated? (Hint: check imports)
- What happens when you click a `MacroCard`? Trace the click handler.

### Step 3.3: Modals and Data Visualization
**Time**: 30 minutes

1. Open `src/features/overview/IndicatorModal.jsx`
2. This is what pops up when you click an indicator card
3. Key sections:
   - Full time series chart (using Recharts library)
   - Download data button
   - Close button

4. Open `src/shared/components/TrendChart.jsx`
5. This wraps Recharts to create line/bar charts
6. Notice the Recharts components: `ResponsiveContainer`, `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`

**Key Insight**: Recharts is a declarative charting library — you describe what you want, it renders it.

**Exercise**:
- In `IndicatorModal`, find where the chart data is prepared
- What's the difference between `LineChart` and `BarChart`?
- How does the "Download CSV" feature work? (Look for `downloadCSV` function)

---

## 📚 Phase 4: Regional Data & Interactive Map

**Goal**: Understand the most complex feature — the interactive Chile map.

### Step 4.1: Regional Data Structure
**Time**: 20 minutes

1. Open `src/shared/constants/regions.js`
2. This file has THREE important exports:
   - `REGION_IDS`: Array of all region codes (["RM", "I", "II", ...])
   - `REGION_NAME_BY_ID`: Maps codes to full names
   - `REGION_NUMERIC_CODE_BY_ID`: Maps codes to BCCH series codes
   - Plus population codes, centroids for map positioning, etc.

3. **Key Challenge**: Chilean region codes are not standardized
   - You use: "RM", "I", "II", "XV"
   - BCCH uses: "13", "01", "02", "15"
   - This file bridges the gap!

**Exercise**:
- What's the full name of region "VIII"?
- What's the BCCH series code for Region Metropolitana's GDP?
- How many regions does Chile have? (Count REGION_IDS)

### Step 4.2: The Interactive Map
**Time**: 30 minutes

1. Open `src/features/regional/MacroMap.jsx`
2. This uses `react-simple-maps` library (built on D3)
3. Key parts:
   - `ComposableMap`: Container for the map
   - `Geographies`: Loads the Chile GeoJSON and renders paths
   - Hover/click handlers to show region data
   - Color scale based on GDP values

4. Open `src/assets/chile.json` (briefly)
   - This is GeoJSON — geographic boundary data for regions
   - Each "feature" is one region with coordinates

**Key Insight**: The map is just SVG paths colored by data values!

**Exercise**:
- How does the map know what color to make each region? (Look for color calculation)
- What happens when you hover over a region?
- Where does `regionalPibData` come from? Trace it back to `useBcchData.js`

---

## 📚 Phase 5: Styling & Theming

**Goal**: Understand how your site looks the way it does.

### Step 5.1: CSS Architecture
**Time**: 15 minutes

1. Open `src/styles/global.css`
   - See how sections, grids, cards are styled
   - Notice class naming: `.overview-section`, `.macro-card`, etc.

2. Open `src/styles/variables.css`
   - CSS custom properties (variables) for colors, spacing, fonts
   - Example: `--color-primary`, `--spacing-lg`

3. Notice the pattern:
   - Variables defined in one place
   - Used throughout: `background: var(--color-bg-primary);`

**Key Insight**: Changing a variable in `variables.css` updates the entire site!

**Exercise**:
- What's the primary color of your site? (Find `--color-primary`)
- How would you increase spacing between sections?
- What font family does the site use?

---

## 📚 Phase 6: Build & Deployment

**Goal**: Understand how your code becomes a live website.

### Step 6.1: Vite Build Process
**Time**: 15 minutes

1. Open `vite.config.js`
   - See React plugin configuration
   - Notice: Very minimal! Vite has smart defaults.

2. Run `npm run build` in terminal
   - Watch the output
   - Check the `dist/` folder that gets created
   - Notice: All your React code is bundled into optimized JS/CSS

**Key Insight**: Vite transforms your modern JSX/ES6 code into browser-ready files.

### Step 6.2: Vercel Deployment
**Time**: 10 minutes

1. Open `vercel.json`
   - See rewrite rules (SPA routing)
   - See security headers (CSP, HSTS, etc.)

2. Understanding the flow:
   - You push to GitHub
   - Vercel detects the push
   - Runs `npm run build`
   - Deploys the `dist/` folder to CDN
   - Your site is live at chileconomics.cl

**Exercise**:
- What does the rewrite rule `"source": "/(.*)"` do?
- Why do you need security headers?
- How would you preview a build locally? (Hint: `npm run preview`)

---

## 📚 Phase 7: Debugging & Development Workflow

**Goal**: Build confidence in modifying and debugging your code.

### Step 7.1: Using Browser DevTools
**Time**: 20 minutes

1. Run `npm run dev` to start your local server
2. Open http://localhost:5173 in Chrome/Firefox
3. Open DevTools (F12)
4. Go to **Network** tab:
   - Refresh page
   - Find the request for `bcch_series.json`
   - Click it to see the full data payload
5. Go to **Console** tab:
   - See any errors or warnings
   - Try typing: `console.log("hello from console")`
6. Go to **React DevTools** (install extension if needed):
   - Inspect component tree
   - See props and state of each component

**Exercise**:
- Open React DevTools and find the `OverviewSection` component
- What props is it receiving?
- Find the `useBcchData` hook state — what's in `indicators`?

### Step 7.2: Making Your First Modification
**Time**: 30 minutes

**Challenge**: Change the site title from "ChilEconomics" to "Chile Economic Dashboard"

1. Use Grep to find where "ChilEconomics" appears:
   ```bash
   # In Claude Code, you can ask me: "Find all occurrences of ChilEconomics"
   ```
2. Likely places:
   - `src/app/shell/HeroHeader.jsx`
   - `index.html` (title tag)
   - Maybe `package.json`
3. Make the changes
4. Save files
5. Check browser — Vite hot-reloads automatically!
6. Verify the change worked

**Exercise**:
- Try changing the primary color in `variables.css`
- Try adding a console.log in `useBcchData.js` to see when data loads
- Try changing the label of one indicator (e.g., "Dólar" → "Tipo de Cambio USD")

---

## 📚 Phase 8: Adding a New Feature (Capstone)

**Goal**: Apply everything you've learned to add something new.

### Project: Add TPM (Monetary Policy Rate) Indicator

**Background**: The Central Bank's TPM is a key rate. Let's add it to your dashboard!

#### Step 1: Find the BCCH Series
1. Go to BCCH API documentation or use their series explorer
2. Find the series ID for TPM (likely something like `F073.TPM.xxx`)
3. Note the frequency (probably monthly)

#### Step 2: Add to Series Config
1. Open `bcch_shared.py`
2. Add to `SERIES_CONFIG_SYNC`:
   ```python
   "tpm": {"id": "F073.TPM.xxx", "name": "TPM", "frequency": "M"}
   ```
3. Save file

#### Step 3: Sync Data
1. Run `npm run sync-data`
2. Wait for it to finish
3. Check `public/data/bcch_series.json` — you should see a new `tpm` key!

#### Step 4: Add to Frontend
1. Open `src/data/bcch/api.js`
2. In `getKeyIndicators()`, add TPM similar to other indicators:
   ```javascript
   const tpmData = series.tpm?.data || [];
   const tpmLatest = series.tpm?.latest;
   // ... build indicator object
   ```
3. Add it to the returned array

#### Step 5: Display It
1. Open `src/app/App.jsx`
2. Add TPM to `CHART_ORDER`: `['ipc', 'dolar', 'desempleo', 'cobre', 'tpm']`
3. The UI should automatically pick it up!

#### Step 6: Test
1. Run `npm run dev`
2. Check if TPM card appears
3. Click it — modal should show full history
4. Verify data looks correct

**Congratulations!** You just added a complete feature end-to-end.

---

## 🎓 Advanced Topics (Optional)

Once you're comfortable with the above, explore these:

### A. Performance Optimization
- Learn about React.memo() to prevent unnecessary re-renders
- Understand useMemo() and useCallback() hooks
- Profile your app with React DevTools Profiler

### B. TypeScript Migration
- Your project uses plain JavaScript
- TypeScript adds type safety
- Could prevent bugs and improve IDE autocomplete

### C. State Management Libraries
- Currently using basic React hooks
- For larger apps, consider Zustand or Redux Toolkit
- But your current approach is fine for this size!

### D. Testing
- Add unit tests with Vitest (built into Vite)
- Test utility functions in `series.js`, `format.js`
- Test React components with React Testing Library

### E. Accessibility (a11y)
- Add ARIA labels to charts
- Ensure keyboard navigation works
- Test with screen readers

---

## 📋 Recommended Learning Sequence

**Week 1**: Phases 1-2 (Data foundation and loading)  
**Week 2**: Phases 3-4 (React components and map)  
**Week 3**: Phases 5-7 (Styling, deployment, debugging)  
**Week 4**: Phase 8 (Add a new feature)

**Total time estimate**: 8-12 hours of focused learning

---

## 🆘 When You Get Stuck

1. **Read error messages carefully** — they often tell you exactly what's wrong
2. **Use console.log()** liberally to inspect data at each step
3. **Check the browser console** for runtime errors
4. **Use React DevTools** to inspect component props and state
5. **Ask me (Claude)!** I can help debug specific issues

---

## ✅ Learning Checkpoints

After each phase, you should be able to:

- [ ] **Phase 1**: Explain where your data comes from and how it updates
- [ ] **Phase 2**: Trace how data flows from JSON to React state
- [ ] **Phase 3**: Identify which component renders what on the page
- [ ] **Phase 4**: Understand how the regional map works
- [ ] **Phase 5**: Modify colors, fonts, and spacing
- [ ] **Phase 6**: Explain the build and deployment process
- [ ] **Phase 7**: Debug issues using browser tools
- [ ] **Phase 8**: Add a new economic indicator independently

---

## 🎯 Final Goal

By completing this plan, you'll transition from:
- "I vibe-coded this and it works somehow"

To:
- "I understand my architecture, can debug issues, and confidently add features"

You're not just learning to code — you're becoming the expert on **your specific system**. That's a powerful position to be in!

Good luck! 🚀
