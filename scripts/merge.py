import os
import glob
import json
import argparse
import pandas as pd
from datetime import datetime

def merge_date(date_str=None):
    if not date_str:
        date_str = datetime.utcnow().strftime('%Y%m%d')
        
    print(f"Merging enriched batches for date: {date_str}")
    
    batches_dir = os.path.join('data', 'batches', date_str)
    if not os.path.exists(batches_dir):
        raise FileNotFoundError(f"Batches directory not found: {batches_dir}")
        
    pattern = os.path.join(batches_dir, "batch_*_enriched.csv")
    enriched_files = glob.glob(pattern)
    
    if not enriched_files:
        raise FileNotFoundError(f"No enriched files found in {batches_dir}")
        
    print(f"Found {len(enriched_files)} enriched batch files to merge.")
    
    # Concatenate all batch files
    dfs = []
    for filepath in enriched_files:
        dfs.append(pd.read_csv(filepath))
        
    merged_df = pd.concat(dfs, ignore_index=True)
    
    # Deduplicate on ticker, keeping the last occurrence
    merged_df = merged_df.drop_duplicates(subset=['ticker'], keep='last')
    
    total_rows = len(merged_df)
    print(f"Total deduplicated tickers: {total_rows}")
    
    if total_rows == 0:
        print("No rows to merge.")
        return
        
    # Calculate universe-dependent metrics
    # 1. rs_percentile: rank on a 0-99 scale
    if total_rows > 1:
        # rank method 'min' assigns the minimum rank to ties
        ranks = merged_df['rs_score'].rank(method='min')
        merged_df['rs_percentile'] = ((ranks - 1) / (total_rows - 1)) * 99.0
    else:
        merged_df['rs_percentile'] = 99.0
        
    merged_df['rs_percentile'] = merged_df['rs_percentile'].round(2)
    
    # 2. rts_composite = (rs_percentile * 0.6) + (trend_strength * 0.4)
    merged_df['rts_composite'] = (merged_df['rs_percentile'] * 0.6) + (merged_df['trend_strength'] * 0.4)
    merged_df['rts_composite'] = merged_df['rts_composite'].round(2)
    
    # 3. rts_grade and rts_grade_rank
    def get_grade_and_rank(score):
        if score >= 92:
            return "A+", 1
        elif score >= 82:
            return "A", 2
        elif score >= 68:
            return "B", 3
        elif score >= 52:
            return "C", 4
        elif score >= 38:
            return "D", 5
        elif score >= 26:
            return "E", 6
        elif score >= 14:
            return "F", 7
        else:
            return "G", 8
            
    grades_ranks = [get_grade_and_rank(score) for score in merged_df['rts_composite']]
    merged_df['rts_grade'] = [gr[0] for gr in grades_ranks]
    merged_df['rts_grade_rank'] = [gr[1] for gr in grades_ranks]
    
    # 4. colour_band
    median_atr = merged_df['atr14'].median()
    print(f"Universe median ATR14: {median_atr:.4f}")
    
    def assign_colour_band(row):
        atr = row['atr14']
        ext = row['atr_extension']
        
        # Priority 1: Blue (ATR < universe median ATR)
        if atr < median_atr:
            return "blue"
        # Stocks below SMA50 (ext < 0) are not flagged with an extension color
        if ext < 0:
            return ""
        # Priority 2: Green
        if 0 <= ext <= 4:
            return "green"
        # Priority 3: Yellow
        if 4 < ext <= 5:
            return "yellow"
        # Priority 4: Orange
        if 5 < ext <= 7:
            return "orange"
        # Priority 5: Purple
        if 7 < ext <= 11:
            return "purple"
        # Priority 6: Red
        if ext > 11:
            return "red"
        return ""
        
    merged_df['colour_band'] = merged_df.apply(assign_colour_band, axis=1)
    
    # Sort by rts_grade_rank ascending (A+ first) then rs_score descending
    merged_df = merged_df.sort_values(by=['rts_grade_rank', 'rs_score'], ascending=[True, False])
    
    # Write to final CSV
    os.makedirs('data', exist_ok=True)
    out_path = os.path.join('data', f"rts_{date_str}.csv")
    merged_df.to_csv(out_path, index=False)
    print(f"Successfully merged data saved to {out_path}")
    
    # Update manifest.json
    update_manifest()

def update_manifest():
    data_dir = 'data'
    os.makedirs(data_dir, exist_ok=True)
    
    # Scan for rts_YYYYMMDD.csv
    pattern = os.path.join(data_dir, "rts_*.csv")
    csv_files = glob.glob(pattern)
    
    dates = []
    for filepath in csv_files:
        filename = os.path.basename(filepath)
        # Extract YYYYMMDD
        parts = filename.replace('.csv', '').split('_')
        if len(parts) >= 2 and len(parts[1]) == 8 and parts[1].isdigit():
            dates.append(parts[1])
            
    # Sort dates in descending order (latest first)
    dates = sorted(list(set(dates)), reverse=True)
    
    manifest_path = os.path.join(data_dir, "manifest.json")
    with open(manifest_path, 'w') as f:
        json.dump(dates, f, indent=2)
        
    print(f"Updated manifest file at {manifest_path} with {len(dates)} dates: {dates}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Merge enriched batch files for a specific date.")
    parser.add_argument('--date', type=str, help="Date in YYYYMMDD format (default: today's UTC date)")
    args = parser.parse_args()
    
    merge_date(args.date)
