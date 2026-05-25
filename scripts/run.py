import os
import sys
import argparse
import glob
from datetime import datetime

# Add the scripts directory to the path so we can import the other modules
scripts_dir = os.path.dirname(os.path.abspath(__file__))
if scripts_dir not in sys.path:
    sys.path.append(scripts_dir)

from split_universe import split_universe
from fetch_batch import fetch_batch
from merge import merge_date

def run_pipeline(date_str=None):
    if not date_str:
        date_str = datetime.utcnow().strftime('%Y%m%d')
        
    print(f"==========================================")
    print(f"Starting RTS Data Pipeline for date: {date_str}")
    print(f"Start time: {datetime.utcnow().isoformat()}")
    print(f"==========================================")
    
    try:
        # Step 1: Split Universe
        print("\n--- STEP 1: Splitting universe ---")
        num_batches = split_universe()
        if num_batches == 0:
            print("Error: No batches created. Aborting.")
            return 1
            
        # Step 2: Fetch and Enrich Batches
        print("\n--- STEP 2: Fetching batch data ---")
        batches_pattern = os.path.join('data', 'batches', 'batch_[0-9][0-9].csv')
        batch_files = sorted(glob.glob(batches_pattern))
        
        if not batch_files:
            print(f"Error: No batch files found matching pattern '{batches_pattern}'")
            return 1
            
        print(f"Found {len(batch_files)} batches to process.")
        
        for idx, batch_file in enumerate(batch_files):
            print(f"\nProcessing batch {idx+1}/{len(batch_files)}: {batch_file}")
            fetch_batch(batch_file, date_str)
            
        # Step 3: Merge Batches
        print("\n--- STEP 3: Merging batches ---")
        merge_date(date_str)
        
        print(f"\n==========================================")
        print(f"RTS Data Pipeline COMPLETED SUCCESSFULY!")
        print(f"End time: {datetime.utcnow().isoformat()}")
        print(f"==========================================")
        return 0
        
    except Exception as e:
        print(f"\n==========================================")
        print(f"RTS Data Pipeline FAILED with error: {e}")
        import traceback
        traceback.print_exc()
        print(f"==========================================")
        return 1

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Run the entire RTS data pipeline.")
    parser.add_argument('--date', type=str, help="Date in YYYYMMDD format (default: today's UTC date)")
    args = parser.parse_args()
    
    exit_code = run_pipeline(args.date)
    sys.exit(exit_code)
