#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert perfume CSV to JSON format matching DataFile interface
"""
import os
import csv
import json
import sys
from collections import defaultdict

# Set stdout encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def parse_notes(note_string):
    """Parse note string into array, handling various delimiters"""
    if not note_string or not note_string.strip():
        return []
    
    # Try common delimiters
    for delimiter in ['،', ',', ';', '|', '\n']:
        if delimiter in note_string:
            notes = [n.strip() for n in note_string.split(delimiter)]
            return [n for n in notes if n]
    
    # If no delimiter found, return as single note
    return [note_string.strip()] if note_string.strip() else []

def find_csv_file():
    """Find CSV file in current directory"""
    csv_files = [f for f in os.listdir('.') if f.endswith('.csv')]
    if not csv_files:
        raise FileNotFoundError("No CSV file found in current directory")
    return csv_files[0]

def convert_csv_to_json(csv_file_path):
    """Convert CSV to JSON matching DataFile interface"""
    
    # Maps for brand and collection ID generation
    brand_name_to_id = {}
    collection_name_to_id = {}
    brand_counter = 1
    collection_counter = 1
    
    perfumes = []
    brands_set = set()
    collections_set = set()
    
    print(f"[CSV Converter] Reading CSV file: {csv_file_path}")
    print("[CSV Converter] Starting conversion process...")
    
    with open(csv_file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for idx, row in enumerate(reader, start=1):
            # Extract and clean values
            name_fa = (row.get('نام فارسی ', '') or row.get('نام فارسی', '')).strip()
            name_en = (row.get('نام انگلیسی ', '') or row.get('نام انگلیسی', '')).strip()
            brand_name = (row.get('برند ', '') or row.get('برند', '')).strip()
            collection_name = (row.get('کالکشن ', '') or row.get('کالکشن', '')).strip()
            image_url = (row.get('عکس', '') or row.get('عکس ', '')).strip()
            gender_raw = (row.get('جنسیت', '') or row.get('جنسیت ', '')).strip()
            
            # Parse notes
            top_notes_raw = row.get('نت اولیه ', '') or row.get('نت اولیه', '')
            middle_notes_raw = row.get('نت میانی', '') or row.get('نت میانی ', '')
            base_notes_raw = row.get('نت پایانی', '') or row.get('نت پایانی ', '')
            
            top_notes = parse_notes(top_notes_raw)
            middle_notes = parse_notes(middle_notes_raw)
            base_notes = parse_notes(base_notes_raw)
            
            # Skip rows without at least a name
            if not name_fa and not name_en:
                print(f"[CSV Converter] WARNING: Skipping row {idx} - no name found")
                continue
            
            # Log every 50 rows
            if idx % 50 == 0:
                print(f"[CSV Converter] Processing row {idx}...")
            
            # Generate brand ID
            brand_id = None
            if brand_name:
                brands_set.add(brand_name)
                if brand_name not in brand_name_to_id:
                    brand_name_to_id[brand_name] = brand_counter
                    brand_counter += 1
                brand_id = brand_name_to_id[brand_name]
            
            # Generate collection ID
            collection_id = None
            if collection_name:
                collections_set.add(collection_name)
                if collection_name not in collection_name_to_id:
                    collection_name_to_id[collection_name] = collection_counter
                    collection_counter += 1
                collection_id = collection_name_to_id[collection_name]
            
            # Normalize gender
            gender = None
            if gender_raw:
                gender_lower = gender_raw.lower()
                if 'زن' in gender_lower or 'female' in gender_lower:
                    gender = 'female'
                elif 'مرد' in gender_lower or 'male' in gender_lower:
                    gender = 'male'
                elif 'یونیسکس' in gender_lower or 'unisex' in gender_lower:
                    gender = 'unisex'
            
            # Normalize image URL
            cover = None
            if image_url:
                # If it's a relative path, ensure it starts with /
                if not image_url.startswith('http') and not image_url.startswith('/'):
                    image_url = '/' + image_url
                cover = {
                    'url': image_url
                }
            
            # Create perfume entry
            perfume = {
                'id': idx,
                'name_en': name_en or name_fa,
                'name_fa': name_fa or name_en,
                'notes': {
                    'top': top_notes,
                    'middle': middle_notes,
                    'base': base_notes
                }
            }
            
            if brand_id:
                perfume['brand'] = brand_id
            if collection_id:
                perfume['collection'] = collection_id
            if gender:
                perfume['gender'] = gender
            if cover:
                perfume['cover'] = cover
            
            perfumes.append(perfume)
    
    # Create brands list
    brands = [
        {'id': brand_name_to_id[name], 'name': name}
        for name in sorted(brand_name_to_id.keys())
    ]
    
    # Create collections list
    collections = [
        {'id': collection_name_to_id[name], 'name': name}
        for name in sorted(collection_name_to_id.keys())
    ]
    
    # Create final JSON structure
    result = {
        'brands': brands,
        'collections': collections,
        'perfumes': perfumes
    }
    
    print(f"\nConversion complete!")
    print(f"  - Brands: {len(brands)}")
    print(f"  - Collections: {len(collections)}")
    print(f"  - Perfumes: {len(perfumes)}")
    
    return result

def main():
    try:
        csv_file = find_csv_file()
        json_data = convert_csv_to_json(csv_file)
        
        # Ensure directories exist
        os.makedirs('data', exist_ok=True)
        os.makedirs('public/data', exist_ok=True)
        
        # Write to both locations
        output_files = ['data/data.json', 'public/data/data.json']
        for output_file in output_files:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, ensure_ascii=False, indent=2)
            print(f"  - Written to {output_file}")
        
        print("\n✅ CSV to JSON conversion successful!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

