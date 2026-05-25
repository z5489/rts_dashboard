# RTS Dashboard (Relative Trend Strength System)

The Relative Trend Strength (RTS) Dashboard is a nightly data pipeline and stock screening system based on the Relative Trend Strength system popularized by Steve Jacobs (@SteveDJacobs).

This repository features:
1. A python-based nightly ETL pipeline that fetches data from Yahoo Finance, computes technical indicators, and ranks the universe.
2. A React + Vite dashboard displaying the stock screener in sortable table and card grid views, with advanced filtering and interactive charting.

---

## 🎨 Colour System Reference

The colour coding of tickers and cards in the system highlights volatility and extension levels, indicating trading viability and pullback risks:

| Colour Band | ATR-to-SMA50 Multiple | Interpretation | Action Implication |
| :--- | :--- | :--- | :--- |
| **Blue** 🔵 | Any (ATR14 < universe median) | Low volatility - not ideal for swing trades | Skip or monitor only |
| **Green** 🟢 | $0 \times$ to $4\times$ (above SMA50) | Non-extended, actionable uptrend | Primary watchlist / entry candidates |
| **Yellow** 🟡 | $4\times$ to $5\times$ (above SMA50) | Mildly extended | Cautious entry; tighten stops |
| **Orange** 🟠 | $5\times$ to $7\times$ (above SMA50) | Moderately extended | Avoid new entries; hold existing |
| **Purple** 🟣 | $7\times$ to $11\times$ (above SMA50) | Extended, due for consolidation | Reduce size; watch for pullbacks |
| **Red** 🔴 | $> 11\times$ (above SMA50) | Over-extended, high pullback risk | Exit signal; do not enter |
| *Neutral / Gray* | Below SMA50 (not Blue) | Stock is below its 50-day SMA | Avoid or watch for base building |

---

## 📊 RTS Grade Reference

RTS grades are computed via a composite score: $60\%$ Relative Strength Percentile (vs S&P 500) and $40\%$ Trend Strength Score.

| Grade | Composite Score Range | Approx Universe % | Characteristics |
| :--- | :--- | :--- | :--- |
| **A+** | 92 – 100 | ~5% | Highest relative strength + cleanest trend; top momentum leaders |
| **A** | 82 – 91 | ~8% | Excellent relative strength and trend; primary focus stocks |
| **B** | 68 – 81 | ~15% | Above-average relative strength and trend; solid watchlist |
| **C** | 52 – 67 | ~20% | Average; moderate relative strength or minor trend weakness |
| **D** | 38 – 51 | ~20% | Below average; avoid for long swing trades |
| **E** | 26 – 37 | ~14% | Weak; trending lower or underperforming the market |
| **F** | 14 – 25 | ~10% | Poor; significant underperformance and downtrend |
| **G** | 0 – 13 | ~8% | Weakest; worst relative strength and trend quality |

---

## 🚀 Repository Structure

```
rts-dashboard/
├── universe.csv             # Master list of tickers to screen
├── README.md                # This documentation
├── docs/
│   ├── rts-dashboard-spec.md
│   ├── implementation_plan.md
│   └── walkthrough.md
├── scripts/
│   ├── split_universe.py    # Splits master list into batches of 9
│   ├── fetch_batch.py       # Scrapes Yahoo Finance and computes metrics
│   ├── merge.py             # Merges batches, calculates ranks/percentiles/bands
│   └── run.py               # Orchestrates the whole pipeline
├── data/
│   ├── manifest.json        # Lists all dates with computed files
│   └── rts_YYYYMMDD.csv     # Daily ranked and graded stock data
└── frontend/                # React + Vite frontend dashboard
```

---

## 🛠️ Getting Started

### Python Pipeline Setup
1. Install Python 3.11+.
2. Install pip dependencies:
   ```bash
   pip install yfinance pandas numpy
   ```
3. Run the pipeline:
   ```bash
   python scripts/run.py
   # Or run for a specific date
   python scripts/run.py --date 20260525
   ```

### Frontend Dashboard Setup
1. Navigate to `/frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```
4. Access the dashboard at `http://localhost:5173`.
