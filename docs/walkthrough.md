# RTS Dashboard Implementation Walkthrough

This document reviews the completed implementation of the Relative Trend Strength (RTS) nightly data pipeline and the React + Vite frontend dashboard.

---

## 🛠️ Accomplished Features

### 1. Data Pipeline
We implemented the pipeline scripts inside `/scripts` and the actions workflow:
- **`split_universe.py`**: Divides the master `universe.csv` into exactly 6 static, non-date-labeled batch CSVs: `batch_01.csv` through `batch_06.csv` inside `data/batches/`.
- **`fetch_batch.py`**: Downloads 2 years of daily data from yfinance for the batch's tickers and the `SPY` relative strength benchmark. It computes ATR14, SMA50, SMA200, ATR extension, and RS Score (3M, 6M, 12M vs SPY) with client-side history fallbacks in case yfinance `info` fails. Outputs to `data/batches/YYYYMMDD/batch_NN_YYYYMMDD_enriched.csv`.
- **`merge.py`**: Combines enriched batches, ranks tickers, and calculates universe-wide metrics (`rs_percentile` rank, `rts_composite` score, `rts_grade`, and `colour_band` using the universe's median ATR). It also updates `data/manifest.json`.
- **`run.py`**: Orchestrates the entire pipeline locally, accepting a `--date` parameter.
- **GitHub Actions Workflow (`rts_pipeline.yml`)**: Implements a **parallel matrix strategy** to run all 6 batch fetches in parallel on separate runners (bypassing yfinance rate limits), followed by a merge job that downloads all outputs, merges them, and pushes them back to the repository. Allows individual batch monitoring and re-runs.

### 2. React Frontend Dashboard
A modern glassmorphic dark theme dashboard built with React 18, Vite 8, and Tailwind CSS v3 inside `/frontend`:
- **Header & Toolbar**: Includes a date picker dropdown dynamically populated from `data/manifest.json` and a view toggler (Table vs Card Grid).
- **Collapsible Color System Reference Guide (`LegendPanel.jsx`)**: Displays a collapsible, visual legend detailing each color band, its ATR-to-SMA50 extension range, market interpretation, and corresponding trading rules/action implications.
- **Collapsible Filter Panel (`FilterBar.jsx`)**: Filters by RTS Grade, Color Band, Stage, Sector, Industry (conditional dropdown), and numeric inputs for Price, ATR, and 50d Average Volume.
- **Table View (`TableView.jsx`)**: Responsive sortable table with column visibility checkboxes. Ticker text is colored by RTS band, and grades are badged.
- **Card View (`CardView.jsx`)**: Responsive grid layout where each card features a 4px left-border accent matching its color band, displaying core stats. Clicking a card pops up a details modal.
- **Expandable Charts & Details (`StockDetail.jsx`)**: Fetches 1 year of history through the Vite dev server proxy to bypass CORS, dynamically computes SMA50 and SMA200, and renders a Recharts AreaChart showing the last 6 months (126 trading days) of price action with overlayed SMAs.

---

## 🧪 Pipeline Verification

We executed a manual run of the pipeline on **May 25, 2026** for 18 tickers (yielding exactly 2 batches of 9):
```bash
python scripts/run.py --date 20260525
```

The script successfully completed all tasks and generated:
1. **`data/batches/20260525/`**: Enriched batches containing intermediate computations.
2. **`data/rts_20260525.csv`**: A fully ranked master list of 18 tickers.
3. **`data/manifest.json`**: An index of all available run dates (`["20260525"]`).

### Verification Output Highlights

The merged CSV shows that calculations, grades, and color bands are working correctly:
- **AMD** ranked #1: RTS Grade **A+** (composite `94.90`), `colour_band` = **orange** (extension is `6.51` - between 5 and 7).
- **GOOGL** ranked #2: RTS Grade **A+** (composite `93.41`), `colour_band` = **yellow** (extension is `4.23` - between 4 and 5).
- **XOM** ranked #5: RTS Grade **A** (composite `84.92`), `colour_band` = **blue** (its ATR14 `4.44` is less than the universe median `7.12`).
- **META** and **MSFT** ranked lower: RTS Grade **E** due to negative relative strengths and price trading below moving averages.

---

## 📈 Dev Server CORS Proxy Configuration

To allow browser charting directly from the Yahoo Finance chart API, we configured the following proxy in `/frontend/vite.config.js`:
```javascript
proxy: {
  '/api/yahoo': {
    target: 'https://query1.finance.yahoo.com',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/yahoo/, '')
  }
}
```
This maps browser fetch calls (e.g. `/api/yahoo/v8/finance/chart/AAPL?range=1y&interval=1d`) to the Yahoo Finance API, routing them through Vite to avoid browser CORS errors.
