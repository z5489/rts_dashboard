# RTS Dashboard — Full Project Specification

> Relative Trend Strength (RTS) grading system as popularised by Steve Jacobs (@SteveDJacobs).  
> This document is the single source of truth for the entire project before a line of code is written.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Data Pipeline](#3-data-pipeline)
   - 3.1 [universe.csv format](#31-universecsv-format)
   - 3.2 [Splitting into batches](#32-splitting-into-batches)
   - 3.3 [Fetching & computing fields](#33-fetching--computing-fields)
   - 3.4 [Merging](#34-merging)
   - 3.5 [Orchestrator](#35-orchestrator)
4. [Computed Fields Reference](#4-computed-fields-reference)
   - 4.1 [Raw fields from yfinance](#41-raw-fields-from-yfinance)
   - 4.2 [Derived / computed fields](#42-derived--computed-fields)
   - 4.3 [RTS Grade approximation logic](#43-rts-grade-approximation-logic)
   - 4.4 [Colour band logic](#44-colour-band-logic)
5. [Output CSV Schema](#5-output-csv-schema)
6. [GitHub Actions Workflow](#6-github-actions-workflow)
7. [Frontend Dashboard](#7-frontend-dashboard)
   - 7.1 [Technology stack](#71-technology-stack)
   - 7.2 [Data loading behaviour](#72-data-loading-behaviour)
   - 7.3 [Views](#73-views)
   - 7.4 [Filters](#74-filters)
   - 7.5 [Sorting](#75-sorting)
   - 7.6 [Colour coding in UI](#76-colour-coding-in-ui)
   - 7.7 [Stock detail / chart expand](#77-stock-detail--chart-expand)
8. [Colour System Reference](#8-colour-system-reference)
9. [RTS Grade Reference](#9-rts-grade-reference)
10. [Assumptions & Open Questions](#10-assumptions--open-questions)

---

## 1. Project Overview

The RTS Dashboard is a nightly data pipeline + React frontend that:

- Reads a curated `universe.csv` of US-listed stocks (NYSE / NASDAQ)
- Fetches OHLCV and fundamental data from **Yahoo Finance via `yfinance`**
- Computes a suite of technical metrics, culminating in an **RTS Grade (A+ → G)** and a **colour band** per the Steve Jacobs RTS system
- Stores results as date-stamped CSVs committed back to the repository
- Surfaces results in a **React + Vite** dashboard with table/card views, filters, sorting, and expandable price charts

The pipeline runs on **GitHub Actions**, triggered on a user-configured cron schedule (weeknights, after US market close) and available as a manual `workflow_dispatch` trigger.

---

## 2. Repository Structure

```
rts-dashboard/                     ← repo root
│
├── universe.csv                   ← master list of tickers to process
│
├── scripts/
│   ├── split_universe.py          ← splits universe.csv → batches of 9
│   ├── fetch_batch.py             ← fetches one batch from yfinance, computes all fields
│   ├── merge.py                   ← merges all batch CSVs for a date → single daily CSV
│   └── run.py                     ← orchestrator: split → fetch all → merge
│
├── frontend/                      ← React + Vite application
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── data/
│   ├── batches/
│   │   └── YYYYMMDD/
│   │       ├── batch_01_YYYYMMDD.csv
│   │       ├── batch_02_YYYYMMDD.csv
│   │       └── ...
│   └── rts_YYYYMMDD.csv           ← daily merged output (one per date)
│
└── .github/
    └── workflows/
        └── rts_pipeline.yml
```

> **Note:** `data/` and all generated CSVs are committed back to the repo by the Actions workflow. The frontend loads CSVs directly from the `data/` directory.

---

## 3. Data Pipeline

### 3.1 `universe.csv` format

The input file lives at the repo root. Minimum required columns:

| Column     | Type   | Description                              |
|------------|--------|------------------------------------------|
| `ticker`   | string | Yahoo Finance-compatible ticker symbol   |
| `name`     | string | Company display name                     |
| `sector`   | string | GICS sector                              |
| `industry` | string | GICS industry                            |
| `exchange` | string | `NYSE` or `NASDAQ`                       |

Example rows:
```
ticker,name,sector,industry,exchange
AAPL,Apple Inc,Technology,Consumer Electronics,NASDAQ
NVDA,NVIDIA Corp,Technology,Semiconductors,NASDAQ
JPM,JPMorgan Chase & Co,Financial Services,Banks-Diversified,NYSE
```

---

### 3.2 Splitting into batches

**Script:** `scripts/split_universe.py`

**Behaviour:**
- Reads `universe.csv` from the repo root
- Splits into sequential batches of **9 tickers** each
- Outputs each batch to `data/batches/YYYYMMDD/batch_NN_YYYYMMDD.csv`
  - `YYYYMMDD` = today's date (UTC)
  - `NN` = zero-padded batch number (01, 02, 03 …)
- Creates the output directory if it does not exist
- Logs how many batches were created and total ticker count

**Output filename example:**
```
data/batches/20250524/batch_03_20250524.csv
```

**Batch CSV format:** Same columns as `universe.csv` (ticker, name, sector, industry, exchange) — just a 9-row slice.

---

### 3.3 Fetching & computing fields

**Script:** `scripts/fetch_batch.py`

**Invocation:**
```bash
python scripts/fetch_batch.py --batch data/batches/20250524/batch_03_20250524.csv
```

**Behaviour:**
- Accepts a single `--batch` argument pointing to a batch CSV
- For each ticker in the batch:
  - Downloads historical OHLCV data from yfinance (minimum 1 year of daily data to support 12M RS lookback)
  - Downloads `info` dict for fundamentals (market cap, avg volume, sector, industry)
  - Computes all fields listed in [Section 4](#4-computed-fields-reference)
  - On any per-ticker error: logs the error with the ticker symbol and continues — does **not** abort the batch
- Writes results to the same directory as the input batch file, appended with `_enriched`:
  ```
  data/batches/20250524/batch_03_20250524_enriched.csv
  ```
- **Sleep:** After completing each batch (all 9 tickers), sleeps for **90 seconds** before returning control to the orchestrator. This prevents Yahoo Finance rate-limit timeouts when batches are processed sequentially.

---

### 3.4 Merging

**Script:** `scripts/merge.py`

**Behaviour:**
- Scans `data/batches/YYYYMMDD/` for all `*_enriched.csv` files
- Concatenates them into a single dataframe
- Deduplicates on `ticker` (keeps last, in case of reruns)
- Sorts by `rts_grade_rank` ascending (A+ = 1, G = last) then `rs_score` descending
- Writes to `data/rts_YYYYMMDD.csv`
- Logs total rows merged and output path

---

### 3.5 Orchestrator

**Script:** `scripts/run.py`

**Behaviour:**
- Calls `split_universe.py` logic inline (or imports it as a module)
- Iterates over every batch file produced, calling `fetch_batch.py` logic for each
- After each batch fetch completes, the 90-second sleep fires (inside `fetch_batch.py`)
- After all batches are done, calls `merge.py` logic
- Accepts optional `--date YYYYMMDD` argument to reprocess a specific date (defaults to today)
- Exits with code `0` on success, `1` on any unrecoverable error

**Also callable as:**
```bash
python scripts/run.py
python scripts/run.py --date 20250524
```

---

## 4. Computed Fields Reference

### 4.1 Raw fields from yfinance

| Field              | yfinance source              | Notes                              |
|--------------------|------------------------------|------------------------------------|
| `close`            | `history().Close`            | Most recent trading day close      |
| `avg_volume_50d`   | `info['averageVolume']`      | 50-day average daily volume        |
| `market_cap`       | `info['marketCap']`          | In USD                             |
| `52w_high`         | `info['fiftyTwoWeekHigh']`   |                                    |
| `52w_low`          | `info['fiftyTwoWeekLow']`    |                                    |

---

### 4.2 Derived / computed fields

#### ATR (14-day)
Standard Wilder ATR using the last 14 trading days of OHLC data.

```
TR = max(High - Low, abs(High - PrevClose), abs(Low - PrevClose))
ATR14 = Wilder smoothed average of TR over 14 days
```

#### SMA50
Simple 50-day moving average of closing prices.

#### ATR-to-SMA50 multiple (extension level)
```
atr_extension = (close - sma50) / atr14
```
Positive = above SMA50. This drives colour band assignment.

#### RS Score (Composite Relative Strength vs S&P 500)
Measures the stock's percentage price performance relative to SPY over three lookback windows, then combines them:

| Period   | Lookback       | Weight |
|----------|---------------|--------|
| 3 months | 63 trading days | 25%  |
| 6 months | 126 trading days | 35%  |
| 12 months | 252 trading days | 40% |

```
rs_3m  = (stock_return_3m  - spy_return_3m)
rs_6m  = (stock_return_6m  - spy_return_6m)
rs_12m = (stock_return_12m - spy_return_12m)

rs_score = (rs_3m * 0.25) + (rs_6m * 0.35) + (rs_12m * 0.40)
```

#### RS Percentile
Rank of `rs_score` within the full universe on a 0–99 scale (higher = stronger).

#### Trend Strength Score (0–100)
Composite of four sub-components, each scored 0–25:

| Sub-component            | Description                                                  | Max |
|--------------------------|--------------------------------------------------------------|-----|
| Price vs SMA50           | Above SMA50 = 25, within 5% below = 12, further below = 0  | 25  |
| Price vs SMA200          | Above SMA200 = 25, within 10% below = 12, further below = 0 | 25  |
| SMA50 slope              | Rising (positive 20d slope) = 25, flat = 12, declining = 0  | 25  |
| Consistency (% green days) | % of last 20 days that closed higher than open            | 25  |

#### Stage Classification (approximation)
Based on price position relative to SMA50 and SMA200 and their relative slopes:

| Stage | Condition                                                              |
|-------|------------------------------------------------------------------------|
| 1     | Price below both MAs; MAs flat or declining; base-building             |
| 2     | Price above SMA50 and SMA200; SMA50 > SMA200; MAs rising — **uptrend** |
| 3     | Price topping; MAs flattening; SMA50 starting to cross below SMA200    |
| 4     | Price below both MAs; MAs declining — **downtrend**                    |

#### % from 52-week High
```
pct_from_52w_high = ((close - 52w_high) / 52w_high) * 100
```
Negative value = below the 52-week high.

---

### 4.3 RTS Grade approximation logic

RTS grade is derived from a composite of `rs_percentile` and `trend_strength_score`. Since Steve Jacobs has not published an exact formula, this approximation is calibrated to match the grade distribution visible in his public grids (roughly: A+/A = top ~10%, B = next 15%, C = next 20%, D = next 20%, E = next 15%, F = next 12%, G = bottom ~8%).

**Composite RTS Score:**
```
rts_composite = (rs_percentile * 0.6) + (trend_strength_score * 0.4)
```

**Grade thresholds (applied to `rts_composite`, 0–100 scale):**

| Grade | Min composite score |
|-------|-------------------|
| A+    | 92                |
| A     | 82                |
| B     | 68                |
| C     | 52                |
| D     | 38                |
| E     | 26                |
| F     | 14                |
| G     | 0                 |

**`rts_grade_rank`** — integer 1–8 (1 = A+, 8 = G) used for sorting.

> These thresholds should be treated as a starting point. Once real data has been processed, the distribution should be reviewed and thresholds adjusted to match observed grade spreads from Jacobs' grids.

---

### 4.4 Colour band logic

Colour band is assigned **after** grade and ATR extension are computed, using the following priority order:

| Priority | Colour   | Condition                                      | Meaning                              |
|----------|----------|------------------------------------------------|--------------------------------------|
| 1        | Blue     | `atr14` < universe median ATR                  | Low volatility — less swing-tradeable |
| 2        | Green    | `atr_extension` between 0 and 4 (inclusive)   | Actionable, non-extended Stage 2     |
| 3        | Yellow   | `atr_extension` > 4 and ≤ 5                   | Mild extension                       |
| 4        | Orange   | `atr_extension` > 5 and ≤ 7                   | Moderate extension                   |
| 5        | Purple   | `atr_extension` > 7 and ≤ 11                  | Extended — monitor for exit          |
| 6        | Red      | `atr_extension` > 11                          | Over-extended — high pullback risk   |

> Stocks below SMA50 (`atr_extension` < 0) are not flagged with an extension colour. In that case the blue check still applies if ATR is below median; otherwise no colour band is assigned (or a neutral grey can be used).

---

## 5. Output CSV Schema

Each `rts_YYYYMMDD.csv` and each `*_enriched.csv` batch file contains the following columns in this order:

| Column               | Type    | Description                                     |
|----------------------|---------|-------------------------------------------------|
| `ticker`             | string  | Ticker symbol                                   |
| `name`               | string  | Company name                                    |
| `sector`             | string  | GICS sector                                     |
| `industry`           | string  | GICS industry                                   |
| `exchange`           | string  | NYSE or NASDAQ                                  |
| `close`              | float   | Latest closing price (USD)                      |
| `avg_volume_50d`     | integer | 50-day average daily volume                     |
| `market_cap`         | integer | Market capitalisation (USD)                     |
| `atr14`              | float   | 14-day Average True Range                       |
| `sma50`              | float   | 50-day simple moving average                    |
| `sma200`             | float   | 200-day simple moving average                   |
| `atr_extension`      | float   | (close − sma50) / atr14                         |
| `rs_3m`              | float   | 3-month RS vs SPY (raw, %)                      |
| `rs_6m`              | float   | 6-month RS vs SPY (raw, %)                      |
| `rs_12m`             | float   | 12-month RS vs SPY (raw, %)                     |
| `rs_score`           | float   | Composite weighted RS score                     |
| `rs_percentile`      | float   | RS rank within universe (0–99)                  |
| `trend_strength`     | float   | Trend strength score (0–100)                    |
| `stage`              | integer | Stage classification (1–4)                      |
| `52w_high`           | float   | 52-week high price                              |
| `52w_low`            | float   | 52-week low price                               |
| `pct_from_52w_high`  | float   | % below 52-week high (negative = below)         |
| `rts_composite`      | float   | RTS composite score (0–100)                     |
| `rts_grade`          | string  | RTS grade: A+, A, B, C, D, E, F, G             |
| `rts_grade_rank`     | integer | Sort key: 1 (A+) → 8 (G)                       |
| `colour_band`        | string  | green / yellow / orange / purple / red / blue   |
| `run_date`           | string  | YYYYMMDD — date this row was computed           |

---

## 6. GitHub Actions Workflow

**File:** `.github/workflows/rts_pipeline.yml`

### Trigger
```yaml
on:
  schedule:
    - cron: '<USER_DEFINED>'   # set your own cron expression here
  workflow_dispatch:            # manual trigger from Actions UI
```

### Steps

1. **Checkout** — `actions/checkout@v4` with `fetch-depth: 0` (needed for git push)
2. **Set up Python** — `actions/setup-python@v5`, Python 3.11
3. **Install dependencies**
   ```bash
   pip install yfinance pandas numpy
   ```
4. **Run pipeline**
   ```bash
   python scripts/run.py
   ```
5. **Commit & push results**
   ```bash
   git config user.name  "github-actions[bot]"
   git config user.email "github-actions[bot]@users.noreply.github.com"
   git add data/
   git diff --quiet && git diff --staged --quiet || git commit -m "chore: RTS data update $(date -u +%Y%m%d)"
   git push
   ```

### Permissions
The workflow requires `contents: write` permission to push back to the repo.

### Error handling
- Per-ticker errors are caught inside `fetch_batch.py` and logged — the run continues
- If the entire pipeline exits with a non-zero code, GitHub Actions marks the run as failed (visible in the Actions tab)
- No external notifications — all output is in the Actions run log

### Secrets
No secrets required for yfinance (public data). If rate limiting becomes an issue in future, a paid data API key would be stored as a GitHub Actions secret and injected as an environment variable.

---

## 7. Frontend Dashboard

### 7.1 Technology stack

| Layer       | Choice                        |
|-------------|-------------------------------|
| Framework   | React 18                      |
| Build tool  | Vite 5                        |
| Styling     | Tailwind CSS v3               |
| CSV parsing | PapaParse                     |
| Charts      | Recharts (sparklines + expand)|
| Icons       | Lucide React                  |

Served locally via `vite dev` — no deployment target required.

---

### 7.2 Data loading behaviour

- On load, the app scans the `data/` directory for `rts_YYYYMMDD.csv` files
- **Default:** loads the file with the most recent date
- **Date picker:** a dropdown or calendar control lists all available dates; selecting one reloads the table/cards from that date's CSV
- The CSV is fetched as a static asset (served from the Vite dev server's public directory or a configured static path pointing to `../data/`)
- If no CSV is found for a date, a clear error state is shown

---

### 7.3 Views

Two views, toggled by a button in the top toolbar:

#### Table view (default)
- Full-width sortable data table
- One row per stock
- All major fields visible as columns (user can show/hide columns)
- Ticker cell coloured per colour band (font colour or left-border accent)
- RTS grade shown as a styled badge
- Clicking a row expands an inline chart panel below it

#### Card / grid view
- Responsive grid (3–4 columns on desktop, 2 on tablet, 1 on mobile)
- Each card shows: Ticker, Name, RTS Grade badge, Colour band indicator, Close price, ATR extension, RS Score, Stage
- Card left border (4px) coloured per colour band
- Clicking a card expands a modal or inline chart

---

### 7.4 Filters

Displayed as a collapsible filter panel above the table/grid. All filters are combinable (AND logic).

| Filter               | Control type         | Options / behaviour                                      |
|----------------------|----------------------|----------------------------------------------------------|
| RTS Grade            | Multi-select pills   | A+, A, B, C, D, E, F, G                                |
| Colour band          | Multi-select pills   | Green, Yellow, Orange, Purple, Red, Blue                |
| ATR extension bucket | Range slider         | Min / Max `atr_extension` value                         |
| Sector               | Dropdown multi-select| All sectors present in loaded CSV                       |
| Industry             | Dropdown multi-select| Filtered to sectors selected above                      |
| Min price            | Number input         | Filters out stocks below this close price               |
| Min ATR              | Number input         | Filters out stocks below this ATR14 value               |
| Min avg volume       | Number input         | Filters out stocks below this 50d avg volume            |
| Stage                | Multi-select pills   | 1, 2, 3, 4                                              |

A **Reset filters** button clears all filters at once.  
An active filter count badge appears on the filter toggle button when filters are applied.

---

### 7.5 Sorting

- **Default sort:** `rts_grade_rank` ascending (A+ first), then `rs_score` descending as tiebreaker
- Table view: clicking any column header sorts by that column (toggle asc/desc)
- Card view: a sort dropdown in the toolbar (Grade, RS Score, ATR Extension, Price, Volume)

---

### 7.6 Colour coding in UI

The colour system must match the RTS spec exactly. Implementation:

| Colour band | Font/badge colour  | Left-border / accent hex (approx) |
|-------------|-------------------|-----------------------------------|
| Green       | `#16a34a`         | `#22c55e`                         |
| Yellow      | `#ca8a04`         | `#eab308`                         |
| Orange      | `#ea580c`         | `#f97316`                         |
| Purple      | `#7c3aed`         | `#a855f7`                         |
| Red         | `#dc2626`         | `#ef4444`                         |
| Blue        | `#2563eb`         | `#3b82f6`                         |

The ticker symbol text in the table view uses the colour band colour as its font colour (matching Jacobs' grid format). The RTS grade badge uses the same colour as a background tint with a darker text variant.

---

### 7.7 Stock detail / chart expand

Clicking a stock (row or card) expands an inline panel showing:

- **Price sparkline** — 6-month daily close price chart (data from the CSV is insufficient; the chart fetches fresh from yfinance via a lightweight proxy or uses pre-baked OHLC columns if added to the CSV in future)
- **Key metrics summary:** Close, ATR14, SMA50, ATR extension, RS Score, RS Percentile, Trend Strength, Stage, % from 52w High
- **Horizontal reference lines** on the chart: SMA50, SMA200
- A **Close** button collapses the panel

> **Note on chart data:** The daily merged CSV does not store full OHLC history. For the initial version, the sparkline is powered by a direct `fetch` call to the Yahoo Finance chart API (`https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=6mo&interval=1d`) from the browser. This is subject to CORS and rate limits. A future iteration may pre-bake 6-month OHLC data into the CSV or a sidecar JSON file per ticker.

---

## 8. Colour System Reference

| Colour  | ATR-to-SMA50 multiple | Interpretation                              | Action implication                      |
|---------|-----------------------|---------------------------------------------|-----------------------------------------|
| Blue    | Any (ATR below median)| Low volatility — not ideal for swing trades | Skip or monitor only                    |
| Green   | 0× – 4×               | Non-extended, actionable                    | Primary watchlist / entry candidates    |
| Yellow  | 4× – 5×               | Mildly extended                             | Cautious entry; tighten stops           |
| Orange  | 5× – 7×               | Moderately extended                         | Avoid new entries; hold existing        |
| Purple  | 7× – 11×              | Extended — due for consolidation            | Reduce / avoid; flag for pullback watch |
| Red     | > 11×                 | Over-extended — high pullback risk          | Exit signal; do not enter               |

---

## 9. RTS Grade Reference

| Grade | Composite Score | Approx universe % | Characteristics                                                  |
|-------|----------------|--------------------|------------------------------------------------------------------|
| A+    | 92 – 100       | ~5%                | Highest RS + strongest, cleanest trend; top momentum leaders     |
| A     | 82 – 91        | ~8%                | Excellent RS and trend; primary focus stocks                     |
| B     | 68 – 81        | ~15%               | Above-average RS and trend; solid watchlist candidates           |
| C     | 52 – 67        | ~20%               | Average; moderate RS or trend weakness                           |
| D     | 38 – 51        | ~20%               | Below average; avoid for long swing trades                       |
| E     | 26 – 37        | ~14%               | Weak; trending lower or underperforming market                   |
| F     | 14 – 25        | ~10%               | Poor; significant underperformance                               |
| G     | 0 – 13         | ~8%                | Weakest; worst RS and trend quality                              |

> Grade distribution targets are calibrated to roughly match the distribution visible in Steve Jacobs' publicly shared RTS grids. Thresholds should be reviewed after the first real data run and adjusted if the distribution is skewed.

---

## 10. Assumptions & Open Questions

| # | Item | Assumption made | Review trigger |
|---|------|-----------------|----------------|
| 1 | RTS formula | Approximated from public grids; exact formula not published by Jacobs | Adjust thresholds after first real data run |
| 2 | Sparkline data | Fetched live from Yahoo Finance chart API in the browser | If CORS blocks it, pre-bake OHLC into a sidecar JSON per date |
| 3 | SPY as benchmark | Used as S&P 500 proxy for RS calculation | Could swap to `^GSPC` index directly |
| 4 | Stage classification | Approximated using MA crossover rules; not Weinstein's exact definition | May refine with volume analysis in future |
| 5 | Colour for negative extension | Stocks below SMA50 default to no extension colour (or grey neutral) | Confirm preference before build |
| 6 | `data/` served as static assets | Vite dev server configured to serve `../data/` relative to `/frontend` | Confirm `vite.config.js` static path before build |
| 7 | GitHub Actions push permissions | Repo must have Actions write permissions enabled in Settings → Actions → General | Confirm before first run |
| 8 | yfinance rate limits | 90s sleep between batches assumed sufficient | Monitor first runs; increase if 429 errors appear in logs |
| 9 | universe.csv ownership | User maintains and updates `universe.csv` manually | Could add a curation UI in future |
| 10 | Market cap / volume thresholds | No hard floor set; user applies filters in dashboard | Could add minimum liquidity filter in pipeline if needed |

---

*Document version: 1.0 — generated from alignment interview. Update this document whenever the spec changes before updating any code.*
