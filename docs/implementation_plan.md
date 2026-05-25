# Implementation Plan — Relative Trend Strength (RTS) Dashboard

This plan outlines the architecture and execution steps to build the RTS nightly data pipeline and the React-based frontend dashboard, matching the Steve Jacobs Relative Trend Strength grading system.

## Proposed Architecture

- **Data Model**: Master list `universe.csv` with ticker details.
- **Batches**: split into groups of 9 tickers to respect Yahoo Finance rate limits.
- **Scraper**: fetches 2 years of daily data for stocks and SPY benchmark, computing ATR14, SMA50, SMA200, ATR extension, and relative strength metrics. Includes fallbacks for info dict.
- **Merge**: consolidates batches, calculates universe-wide percentiles, grades, and color bands, and updates `data/manifest.json`.
- **Frontend**: React + Vite + Tailwind CSS dashboard with sorting, filtering, and live Recharts detailed charts via Vite proxy.

## Proposed Changes

### Data Model & Configuration
- **`universe.csv`**: Contains tickers to scrape.

### Backend / Data Pipeline
- **`scripts/split_universe.py`**: Divide universe into batches of 9.
- **`scripts/fetch_batch.py`**: Fetch technical metrics and relative strength for batch tickers, sleep 90s.
- **`scripts/merge.py`**: Merge all batches, calculate percentile/grades/color bands, output final daily CSV and `manifest.json`.
- **`scripts/run.py`**: Sequentially orchestrate split, fetch, and merge.

### GitHub Actions Workflow
- **`.github/workflows/rts_pipeline.yml`**: Scheduled GHA job running weeknights to fetch fresh data and commit back to repository.

### Frontend Dashboard
- **`frontend/vite.config.js`**: Setup custom dev server static middleware for `data/` and proxy `/api/yahoo` to bypass CORS.
- **`frontend/src/App.jsx`**: Global state, fetch manifest and CSV data, filter, and sort.
- **`frontend/src/components/FilterBar.jsx`**: Collapsible filters.
- **`frontend/src/components/TableView.jsx`**: Default sortable table view.
- **`frontend/src/components/CardView.jsx`**: Responsive grid card view.
- **`frontend/src/components/StockDetail.jsx`**: Detailed technical summary and live 6-month chart.
