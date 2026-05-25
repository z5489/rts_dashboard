import os
import sys
import argparse
import time
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime

def compute_atr14(df):
    high = df['High']
    low = df['Low']
    close = df['Close']
    prev_close = close.shift(1)
    
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low - prev_close).abs()
    ], axis=1).max(axis=1)
    
    # Wilder's smoothed ATR
    atr = tr.copy()
    if len(tr) >= 14:
        atr.iloc[13] = tr.iloc[:14].mean()
        for i in range(14, len(tr)):
            atr.iloc[i] = (atr.iloc[i-1] * 13 + tr.iloc[i]) / 14
        atr.iloc[:13] = np.nan
    else:
        atr[:] = np.nan
    return atr

def fetch_batch(batch_path, date_str=None):
    print(f"Fetching batch data for: {batch_path}")
    if not os.path.exists(batch_path):
        raise FileNotFoundError(f"Batch file not found: {batch_path}")
        
    df = pd.read_csv(batch_path)
    
    if not date_str:
        date_str = datetime.utcnow().strftime('%Y%m%d')
        
    run_date = date_str
    print(f"Using run date: {run_date}")
    
    # Fetch SPY for relative strength benchmark
    print("Fetching SPY historical data for relative strength...")
    try:
        spy_ticker = yf.Ticker('SPY')
        spy_hist = spy_ticker.history(period='2y')
        if spy_hist.empty:
            raise ValueError("SPY historical data is empty.")
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to fetch SPY data: {e}")
        sys.exit(1)
        
    enriched_rows = []
    
    # Process each ticker in the batch
    for index, row in df.iterrows():
        ticker = str(row['ticker']).strip()
        
        print(f"\nProcessing {ticker}...")
        
        try:
            ticker_obj = yf.Ticker(ticker)
            # Fetch 2y history to compute 252-day calculations, SMA200 and Wilder's ATR
            hist = ticker_obj.history(period='2y')
            if hist.empty:
                print(f"Error: Empty history for {ticker}. Skipping.")
                continue
                
            if len(hist) < 14:
                print(f"Error: Insufficient history for {ticker} (only {len(hist)} days). Skipping.")
                continue
                
            # Fetch info dictionary
            info = {}
            try:
                info = ticker_obj.info
            except Exception as e:
                print(f"Warning: Failed to fetch info for {ticker}: {e}")
                
            close_today = float(hist['Close'].iloc[-1])
            
            # Resolve profile data dynamically from info
            name = info.get('longName') or info.get('shortName') or ticker
            sector = info.get('sector') or 'Unknown'
            industry = info.get('industry') or 'Unknown'
            
            raw_exchange = str(info.get('exchange', '')).upper()
            if 'NMS' in raw_exchange or 'NGM' in raw_exchange or 'NAS' in raw_exchange or 'COMP' in raw_exchange:
                exchange = 'NASDAQ'
            elif 'NYQ' in raw_exchange or 'ASE' in raw_exchange or 'NYS' in raw_exchange:
                exchange = 'NYSE'
            else:
                exchange = raw_exchange if raw_exchange else 'NASDAQ'
            
            # Fundamentals and info metrics with robust fallbacks
            # market_cap
            market_cap = info.get('marketCap')
            if not market_cap:
                shares = info.get('sharesOutstanding')
                if shares:
                    market_cap = int(close_today * shares)
                else:
                    market_cap = 0
            else:
                market_cap = int(market_cap)
                
            # avg_volume_50d
            avg_volume_50d = info.get('averageVolume')
            if not avg_volume_50d:
                # compute from last 50 trading days
                avg_volume_50d = int(hist['Volume'].iloc[-50:].mean()) if len(hist) >= 50 else int(hist['Volume'].mean())
            else:
                avg_volume_50d = int(avg_volume_50d)
                
            # 52w_high and 52w_low
            high_52w = info.get('fiftyTwoWeekHigh')
            if not high_52w:
                # compute from last 252 trading days
                high_52w = float(hist['High'].iloc[-252:].max()) if len(hist) >= 252 else float(hist['High'].max())
            else:
                high_52w = float(high_52w)
                
            low_52w = info.get('fiftyTwoWeekLow')
            if not low_52w:
                low_52w = float(hist['Low'].iloc[-252:].min()) if len(hist) >= 252 else float(hist['Low'].min())
            else:
                low_52w = float(low_52w)
                
            # Computations
            # ATR14
            atr_series = compute_atr14(hist)
            atr14 = float(atr_series.iloc[-1])
            
            if np.isnan(atr14) or atr14 <= 0:
                # Fallback to simple ATR or spread
                atr14 = float((hist['High'] - hist['Low']).iloc[-14:].mean())
                if atr14 <= 0:
                    atr14 = close_today * 0.02 # 2% fallback
                    
            # SMA50 & SMA200
            sma50_series = hist['Close'].rolling(window=50).mean()
            sma200_series = hist['Close'].rolling(window=200).mean()
            
            sma50_val = float(sma50_series.iloc[-1]) if len(hist) >= 50 else close_today
            sma200_val = float(sma200_series.iloc[-1]) if len(hist) >= 200 else close_today
            
            # atr_extension = (close - sma50) / atr14
            atr_extension = (close_today - sma50_val) / atr14
            
            # Relative Strength (RS) vs SPY:
            # period 3m (63 trading days), 6m (126 trading days), 12m (252 trading days)
            dates = hist.index
            today_date = dates[-1]
            
            # 3m
            idx_3m = max(-len(hist), -64)
            date_3m = dates[idx_3m]
            close_3m = float(hist['Close'].iloc[idx_3m])
            stock_return_3m = ((close_today - close_3m) / close_3m) * 100
            
            # 6m
            idx_6m = max(-len(hist), -127)
            date_6m = dates[idx_6m]
            close_6m = float(hist['Close'].iloc[idx_6m])
            stock_return_6m = ((close_today - close_6m) / close_6m) * 100
            
            # 12m
            idx_12m = max(-len(hist), -253)
            date_12m = dates[idx_12m]
            close_12m = float(hist['Close'].iloc[idx_12m])
            stock_return_12m = ((close_today - close_12m) / close_12m) * 100
            
            # Get SPY closes at matching dates
            def get_spy_price(target_dt):
                matches = spy_hist.index[spy_hist.index <= target_dt]
                if len(matches) > 0:
                    return float(spy_hist.loc[matches[-1], 'Close'])
                return float(spy_hist['Close'].iloc[0])
                
            spy_close_today = get_spy_price(today_date)
            spy_close_3m = get_spy_price(date_3m)
            spy_close_6m = get_spy_price(date_6m)
            spy_close_12m = get_spy_price(date_12m)
            
            spy_return_3m = ((spy_close_today - spy_close_3m) / spy_close_3m) * 100
            spy_return_6m = ((spy_close_today - spy_close_6m) / spy_close_6m) * 100
            spy_return_12m = ((spy_close_today - spy_close_12m) / spy_close_12m) * 100
            
            rs_3m = stock_return_3m - spy_return_3m
            rs_6m = stock_return_6m - spy_return_6m
            rs_12m = stock_return_12m - spy_return_12m
            
            rs_score = (rs_3m * 0.25) + (rs_6m * 0.35) + (rs_12m * 0.40)
            
            # Trend Strength Score components (0-100 scale)
            # Component 1: Price vs SMA50 (Above SMA50 = 25, within 5% below = 12, further below = 0)
            if close_today >= sma50_val:
                c1 = 25.0
            elif close_today >= sma50_val * 0.95:
                c1 = 12.0
            else:
                c1 = 0.0
                
            # Component 2: Price vs SMA200 (Above SMA200 = 25, within 10% below = 12, further below = 0)
            if close_today >= sma200_val:
                c2 = 25.0
            elif close_today >= sma200_val * 0.90:
                c2 = 12.0
            else:
                c2 = 0.0
                
            # Component 3: SMA50 slope (Rising (positive 20d slope) = 25, flat = 12, declining = 0)
            # Using 0.05% percentage change threshold for flat
            if len(sma50_series) >= 20:
                sma50_20d_ago = float(sma50_series.iloc[-20])
                slope_pct = (sma50_val - sma50_20d_ago) / sma50_20d_ago if sma50_20d_ago > 0 else 0
                if slope_pct > 0.0005:
                    c3 = 25.0
                elif slope_pct < -0.0005:
                    c3 = 0.0
                else:
                    c3 = 12.0
            else:
                c3 = 12.0
                
            # Component 4: Consistency (% green days of last 20 days)
            if len(hist) >= 20:
                last_20 = hist.iloc[-20:]
                green_days = (last_20['Close'] > last_20['Open']).sum()
                c4 = (green_days / 20.0) * 25.0
            else:
                green_days = (hist['Close'] > hist['Open']).sum()
                c4 = (green_days / len(hist)) * 25.0 if len(hist) > 0 else 12.5
                
            trend_strength = c1 + c2 + c3 + c4
            
            # Stage Classification
            # Calculate slopes for stage logic
            sma50_series_20 = sma50_series.iloc[-20:] if len(sma50_series) >= 20 else sma50_series
            sma200_series_20 = sma200_series.iloc[-20:] if len(sma200_series) >= 20 else sma200_series
            sma50_20d_ago = float(sma50_series_20.iloc[0]) if len(sma50_series_20) > 0 else sma50_val
            sma200_20d_ago = float(sma200_series_20.iloc[0]) if len(sma200_series_20) > 0 else sma200_val
            
            sma50_rising = (sma50_val - sma50_20d_ago) / sma50_20d_ago > 0.0005 if sma50_20d_ago > 0 else False
            sma50_declining = (sma50_val - sma50_20d_ago) / sma50_20d_ago < -0.0005 if sma50_20d_ago > 0 else False
            sma200_rising = (sma200_val - sma200_20d_ago) / sma200_20d_ago > 0.0002 if sma200_20d_ago > 0 else False
            sma200_declining = (sma200_val - sma200_20d_ago) / sma200_20d_ago < -0.0002 if sma200_20d_ago > 0 else False
            
            if close_today > sma50_val and close_today > sma200_val and sma50_val > sma200_val and (sma50_rising or sma200_rising):
                stage = 2
            elif close_today < sma50_val and close_today < sma200_val and (sma50_declining or sma200_declining) and not (close_today > sma200_val):
                stage = 4
            elif close_today < sma50_val and close_today < sma200_val and not (sma50_rising and sma200_rising):
                stage = 1
            else:
                stage = 3
                
            pct_from_52w_high = ((close_today - high_52w) / high_52w) * 100
            
            # Placeholders for universe-dependent metrics (to be calculated in merge.py)
            rs_percentile = 0.0
            rts_composite = 0.0
            rts_grade = ""
            rts_grade_rank = 8
            colour_band = ""
            
            # Add row in precise schema order
            enriched_rows.append({
                'ticker': ticker,
                'name': name,
                'sector': sector,
                'industry': industry,
                'exchange': exchange,
                'close': round(close_today, 2),
                'avg_volume_50d': avg_volume_50d,
                'market_cap': market_cap,
                'atr14': round(atr14, 4),
                'sma50': round(sma50_val, 2),
                'sma200': round(sma200_val, 2),
                'atr_extension': round(atr_extension, 4),
                'rs_3m': round(rs_3m, 2),
                'rs_6m': round(rs_6m, 2),
                'rs_12m': round(rs_12m, 2),
                'rs_score': round(rs_score, 2),
                'rs_percentile': rs_percentile,
                'trend_strength': round(trend_strength, 2),
                'stage': stage,
                '52w_high': round(high_52w, 2),
                '52w_low': round(low_52w, 2),
                'pct_from_52w_high': round(pct_from_52w_high, 2),
                'rts_composite': rts_composite,
                'rts_grade': rts_grade,
                'rts_grade_rank': rts_grade_rank,
                'colour_band': colour_band,
                'run_date': run_date
            })
            
            # Sleep 100ms between tickers to prevent rate limits
            time.sleep(0.1)
            
        except Exception as e:
            print(f"Error fetching data for ticker {ticker}: {e}")
            continue
            
    if len(enriched_rows) == 0:
        print(f"Error: No tickers could be enriched in {batch_path}")
        return
        
    enriched_df = pd.DataFrame(enriched_rows)
    
    # Save enriched file
    base_name = os.path.basename(batch_path)
    batch_num_str = "01"
    parts = base_name.replace('.csv', '').split('_')
    if len(parts) >= 2:
        batch_num_str = parts[1]
    elif len(parts) >= 1 and parts[0].startswith('batch'):
        batch_num_str = parts[0].replace('batch', '')
        
    out_dir = os.path.join('data', 'batches', date_str)
    os.makedirs(out_dir, exist_ok=True)
    out_filename = f"batch_{batch_num_str}_{date_str}_enriched.csv"
    out_path = os.path.join(out_dir, out_filename)
    
    enriched_df.to_csv(out_path, index=False)
    print(f"\nSuccessfully wrote {len(enriched_df)} enriched rows to {out_path}")
    
    # Sleep 90 seconds to respect rate limits
    print("Sleeping 90 seconds to avoid Yahoo Finance rate limits...")
    time.sleep(90)
    print("Sleep completed. Returning control.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Fetch and compute metrics for a batch of tickers.")
    parser.add_argument('--batch', type=str, required=True, help="Path to batch CSV file")
    parser.add_argument('--date', type=str, help="Date in YYYYMMDD format (default: today's UTC date)")
    args = parser.parse_args()
    
    fetch_batch(args.batch, args.date)
