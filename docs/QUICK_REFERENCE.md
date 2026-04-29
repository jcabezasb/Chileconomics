# ChilEconomics Quick Reference Guide

Quick answers to common questions as you learn your project.

---

## 🔍 Where Is...?

| **What I'm Looking For** | **Where to Find It** |
|-------------------------|---------------------|
| Economic series configuration (what data we fetch) | `bcch_shared.py` → `SERIES_CONFIG_SYNC` |
| The actual data (JSON file) | `public/data/bcch_series.json` |
| Data fetching logic | `src/data/bcch/api.js` |
| Data transformation logic | `src/data/bcch/useBcchData.js` |
| Regional mapping (codes, names) | `src/shared/constants/regions.js` |
| Chile map GeoJSON | `src/assets/chile.json` |
| Math/calculation utilities | `src/shared/utils/series.js` |
| Number/date formatting | `src/shared/utils/format.js` |
| Main app component | `src/app/App.jsx` |
| Overview section (main indicators) | `src/features/overview/OverviewSection.jsx` |
| Interactive map | `src/features/regional/MacroMap.jsx` |
| Indicator cards | `src/features/overview/MacroCard.jsx` |
| Modal popups | `src/features/overview/IndicatorModal.jsx` |
| Global CSS | `src/styles/global.css` |
| Color/spacing variables | `src/styles/variables.css` |
| Build configuration | `vite.config.js` |
| Deployment settings | `vercel.json` |
| Automated data sync workflow | `.github/workflows/hourly_sync.yml` |

---

## 🚀 Common Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Build for production (outputs to dist/)
npm run preview          # Preview production build locally
npm run lint             # Check code for errors

# Data
npm run sync-data        # Manually sync data from BCCH API
                         # (requires .env with BCCH_USER and BCCH_PASSWORD)

# Python
pip install -r requirements.txt   # Install Python dependencies
python sync_bcch_data.py          # Same as npm run sync-data

# Git
git log --oneline -10    # See recent commits
git status               # Check what's changed
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────┐
│   BCCH API          │  (Central Bank of Chile)
│   (requires login)  │
└──────────┬──────────┘
           │
           │ sync_bcch_data.py (runs daily via GitHub Actions)
           │
           ▼
┌─────────────────────────────┐
│  public/data/               │
│    bcch_series.json         │  (static file committed to git)
│  { series: { ... } }        │
└──────────┬──────────────────┘
           │
           │ fetch() in api.js
           │
           ▼
┌─────────────────────────────┐
│  useBcchData.js             │  (React hook)
│  - transforms data          │
│  - computes stats           │
│  - provides to components   │
└──────────┬──────────────────┘
           │
           │ props
           │
           ▼
┌─────────────────────────────┐
│  UI Components              │
│  - OverviewSection          │
│  - MacroCard                │
│  - IndicatorModal           │
│  - MacroMap                 │
│  - etc.                     │
└─────────────────────────────┘
```

---

## 🧩 Component Hierarchy

```
App.jsx  (orchestrator - loads data, manages routing)
├── HeroHeader
├── TopNav
├── OverviewSection
│   ├── MacroCard (IMACEC - featured)
│   ├── MacroCard (IPC)
│   ├── MacroCard (Dólar)
│   ├── MacroCard (Desempleo)
│   ├── MacroCard (Cobre)
│   └── IndicatorModal (popup on click)
│       └── TrendChart
├── PibCompositionSection
│   ├── PIBComparisonChart
│   └── PibModal
│       └── DataTableModal
├── RegionalSection
│   └── MacroMap
├── BlogSection
├── BlogPostPriceCoordinator (long-form post)
├── DevelopmentSection
└── ContactSection
```

---

## 🔧 How To...

### Add a New Economic Indicator

1. **Find series ID** from BCCH documentation
2. **Add to config** in `bcch_shared.py`:
   ```python
   "my_indicator": {"id": "F000.XXX.YYY", "name": "My Indicator", "frequency": "M"}
   ```
3. **Sync data**: `npm run sync-data`
4. **Add to frontend** in `src/data/bcch/api.js`:
   ```javascript
   const myData = series.my_indicator?.data || [];
   const myLatest = series.my_indicator?.latest;
   ```
5. **Display it** by adding to `CHART_ORDER` in `App.jsx`

### Change Site Colors

1. Open `src/styles/variables.css`
2. Modify CSS variables:
   ```css
   --color-primary: #your-color;
   ```
3. Save — Vite will hot-reload!

### Debug Data Issues

1. **Check the source**: Open `public/data/bcch_series.json`
2. **Verify series exists**: Search for your series key
3. **Check data quality**: Look for null values or gaps
4. **Use browser console**:
   ```javascript
   // In browser console:
   fetch('/data/bcch_series.json')
     .then(r => r.json())
     .then(d => console.log(d.series.your_series))
   ```

### Test Changes Locally

1. `npm run dev` to start dev server
2. Make your changes
3. Vite auto-refreshes browser
4. Check browser console for errors
5. Use React DevTools to inspect component state

### Deploy to Production

**Automatic**: Just push to `main` branch
```bash
git add .
git commit -m "description of changes"
git push origin main
```
Vercel detects push → builds → deploys automatically

**Manual**: Via Vercel dashboard, trigger redeploy

---

## 📐 Key Concepts

### React Hooks You Use

- `useState`: Store component state (e.g., active modal)
- `useEffect`: Run code when component mounts or when dependencies change
- `useMemo`: Memoize expensive calculations
- `useRef`: Reference DOM elements (e.g., for scrolling)
- `useBcchData` (custom): Your data loading hook

### Data Transformation Pattern

**Raw → Normalized → Computed → Displayed**

1. **Raw**: BCCH API returns DataFrames
2. **Normalized**: `normalize_dataframe()` converts to `[{date, value}]`
3. **Computed**: `computeSeriesStatsAtDate()` calculates YoY, trend, history
4. **Displayed**: Components render formatted values

### Regional Code Mapping

Chilean regions have inconsistent codes across systems:

- **Your code**: `"RM"`, `"I"`, `"XV"` (human-friendly)
- **BCCH PIB**: `"13"`, `"01"`, `"15"` (numeric)
- **BCCH Pop**: `"RM"`, `"TA"`, `"AP"` (abbreviations)

**Solution**: `regions.js` maintains all mappings in one place

---

## 🐛 Common Issues & Solutions

### Issue: Data not updating

**Check:**
1. Did GitHub Action run? (Check Actions tab on GitHub)
2. Is `bcch_series.json` committed? (`git status`)
3. Did Vercel redeploy? (Check Vercel dashboard)

**Solution**: Manually trigger sync, commit, and push

---

### Issue: Chart not displaying

**Check:**
1. Is data loaded? (`console.log(indicators)` in component)
2. Are there data points? (Empty array = no chart)
3. Check browser console for errors

**Solution**: Trace data flow from JSON → hook → component props

---

### Issue: Build fails

**Check:**
1. ESLint errors? Run `npm run lint`
2. Import errors? Check file paths (case-sensitive!)
3. Dependency issues? Run `npm install` again

**Solution**: Read error message carefully — it usually tells you the file and line number

---

### Issue: Map not rendering regions

**Check:**
1. Is `chile.json` loaded? (Network tab in DevTools)
2. Is `regionalPibData` populated? (React DevTools)
3. Are region codes matching? (Console log the data)

**Solution**: Verify region code mapping in `regions.js`

---

## 📚 Learning Resources

### React
- [React Docs](https://react.dev) - Official documentation
- [React Hooks](https://react.dev/reference/react) - Hook reference

### Vite
- [Vite Guide](https://vitejs.dev/guide/) - Build tool docs

### Recharts
- [Recharts Examples](https://recharts.org/en-US/examples) - Chart library

### D3 / react-simple-maps
- [react-simple-maps](https://www.react-simple-maps.io/) - Map library

### JavaScript
- [MDN JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) - Language reference

---

## 💡 Pro Tips

1. **Use Console.log Everywhere**: When in doubt, log it out!
   ```javascript
   console.log('Data at this point:', myData);
   ```

2. **React DevTools is Your Friend**: Inspect props and state visually

3. **Git Commit Often**: Small commits = easy to undo mistakes
   ```bash
   git commit -m "work in progress: testing new feature"
   ```

4. **Test in Production Build**: Sometimes dev works but prod doesn't
   ```bash
   npm run build
   npm run preview
   ```

5. **Read Error Messages**: They're usually helpful, not cryptic

6. **Start Small**: Modify one thing, verify it works, then move to next

7. **Keep a Dev Journal**: Note what you learned each session

---

## 🎯 One-Line Answers

- **Where's the data?** → `public/data/bcch_series.json`
- **How to add series?** → Edit `bcch_shared.py`, run `npm run sync-data`
- **Why won't it build?** → Run `npm run lint` to check for errors
- **How to change colors?** → Edit `src/styles/variables.css`
- **Where's the map data?** → `src/assets/chile.json`
- **How does auto-update work?** → GitHub Actions runs daily sync
- **Where's the main logic?** → `useBcchData.js` hook
- **How to debug?** → Browser DevTools + React DevTools + console.log

---

Remember: Every developer Googles things constantly. It's normal! The difference is knowing **what** to Google and **where** to look in your codebase. This guide gives you both.
