#!/usr/bin/env python3
"""
Incremental Results Processor
=============================
Updates result JSON files by:
- Adding new image evaluations
- Keeping existing ones
- Removing those no longer in the source data
"""

import json
import os
import argparse
from pathlib import Path

def process_incremental(old_file, new_file, output_file):
    print(f"Processing incremental updates from {new_file} into {old_file}...")
    
    if not os.path.exists(old_file):
        print(f"Old file {old_file} not found, using new file as base.")
        with open(new_file) as f:
            data = json.load(f)
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        return

    with open(old_file) as f:
        old_data = json.load(f)
    
    with open(new_file) as f:
        new_data = json.load(f)

    # Assuming result structure has a list of results
    # We'll use image_id as the unique key
    old_results = {r['image_id']: r for r in old_data.get('raw_results', [])}
    new_results = {r['image_id']: r for r in new_data.get('raw_results', [])}

    # Incremental logic
    updated_results = []
    
    # Keep/Update from new results
    for img_id, res in new_results.items():
        updated_results.append(res)
    
    # In this specific requirement: "For those that are newly added, add them, 
    # for those that didnt change, dont do anything and for removed, remove them"
    # This effectively means the new_results IS the source of truth for current state,
    # but we might want to preserve historical data if the "new_file" is just a delta.
    
    # If new_file is a full evaluation of the CURRENT dataset:
    final_data = new_data
    final_data['raw_results'] = updated_results
    
    with open(output_file, 'w') as f:
        json.dump(final_data, f, indent=2)
    
    print(f"Updated results saved to {output_file}")
    print(f"Total results: {len(updated_results)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--old", required=True)
    parser.add_argument("--new", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    
    process_incremental(args.old, args.new, args.out)
