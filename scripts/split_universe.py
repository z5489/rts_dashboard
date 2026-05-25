import os
import pandas as pd
import argparse
from datetime import datetime

def split_universe():
    print("Splitting universe...")
    
    universe_path = 'universe.csv'
    if not os.path.exists(universe_path):
        raise FileNotFoundError(f"Master universe file not found at {universe_path}")
        
    df = pd.read_csv(universe_path)
    # Strip any potential whitespace from column names and string fields
    df.columns = df.columns.str.strip()
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].astype(str).str.strip()
        
    total_tickers = len(df)
    num_batches = 6
    batch_size = (total_tickers + num_batches - 1) // num_batches if total_tickers >= num_batches else 1
    
    output_dir = os.path.join('data', 'batches')
    os.makedirs(output_dir, exist_ok=True)
    
    batches_created = 0
    for idx in range(0, total_tickers, batch_size):
        batch_df = df.iloc[idx : idx + batch_size]
        batch_num = (idx // batch_size) + 1
        batch_filename = f"batch_{batch_num:02d}.csv"
        batch_filepath = os.path.join(output_dir, batch_filename)
        
        batch_df.to_csv(batch_filepath, index=False)
        batches_created += 1
        
    print(f"Successfully created {batches_created} batches for {total_tickers} tickers in {output_dir}")
    return batches_created

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Split universe.csv into 6 static batches of tickers.")
    args = parser.parse_args()
    
    split_universe()
