#!/usr/bin/env python3
"""
Parse perfume_database_cleaned.xlsx into JSON format.
Analyzes the Excel structure and converts it to a structured JSON file.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    import pandas as pd
except ImportError:
    print("ERROR: pandas is not installed. Run: pip install pandas openpyxl")
    sys.exit(1)


def normalize_gender(value: Any) -> Optional[str]:
    """Normalize gender values to match Django model choices."""
    if pd.isna(value) or not value:
        return None
    
    value_str = str(value).lower().strip()
    if value_str in ["male", "m", "men", "مردانه"]:
        return "male"
    elif value_str in ["female", "f", "women", "زنانه"]:
        return "female"
    elif value_str in ["unisex", "u", "un", "یونیسکس"]:
        return "unisex"
    return None


def parse_notes(notes_str: Any) -> List[str]:
    """Parse notes string into a list, handling various separators."""
    if pd.isna(notes_str) or not notes_str:
        return []
    
    if isinstance(notes_str, list):
        return [str(n).strip() for n in notes_str if n]
    
    notes_str = str(notes_str)
    # Try common separators
    separators = [",", ";", "|", "/", "\n"]
    for sep in separators:
        if sep in notes_str:
            return [n.strip() for n in notes_str.split(sep) if n.strip()]
    
    # Single note
    return [notes_str.strip()] if notes_str.strip() else []


def parse_season(season_str: Any) -> List[str]:
    """Parse season string into a list."""
    if pd.isna(season_str) or not season_str:
        return []
    
    season_str = str(season_str).lower().strip()
    season_map = {
        "spring": "spring", "بهار": "spring",
        "summer": "summer", "تابستان": "summer",
        "fall": "fall", "autumn": "fall", "پاییز": "fall",
        "winter": "winter", "زمستان": "winter",
        "all seasons": "all_seasons", "چهارفصل": "all_seasons",
    }
    
    seasons = []
    for key, value in season_map.items():
        if key in season_str:
            if value not in seasons:
                seasons.append(value)
    
    return seasons if seasons else []


def map_excel_to_perfume(row: pd.Series, column_mapping: Dict[str, str]) -> Dict[str, Any]:
    """Map Excel row to Perfume model structure."""
    perfume = {
        "name_en": "",
        "name_fa": "",
        "name": "",
        "brand": "",
        "collection": "",
        "gender": None,
        "family": "",
        "season": "",
        "seasons": [],
        "character": "",
        "intensity": "",
        "notes_top": [],
        "notes_middle": [],
        "notes_base": [],
        "all_notes": [],
        "description": "",
        "tags": [],
        "images": [],
    }
    
    # Map columns
    for excel_col, model_field in column_mapping.items():
        if excel_col not in row.index:
            continue
        
        value = row[excel_col]
        if pd.isna(value):
            continue
        
        if model_field == "name_en":
            perfume["name_en"] = str(value).strip()
            if not perfume["name"]:
                perfume["name"] = perfume["name_en"]
        elif model_field == "name_fa":
            perfume["name_fa"] = str(value).strip()
        elif model_field == "brand":
            perfume["brand"] = str(value).strip()
        elif model_field == "collection":
            perfume["collection"] = str(value).strip()
        elif model_field == "gender":
            perfume["gender"] = normalize_gender(value)
        elif model_field == "family":
            perfume["family"] = str(value).strip()
        elif model_field == "season":
            perfume["season"] = str(value).strip()
            perfume["seasons"] = parse_season(value)
        elif model_field == "character":
            perfume["character"] = str(value).strip()
        elif model_field == "intensity":
            perfume["intensity"] = str(value).strip()
        elif model_field == "notes_top":
            perfume["notes_top"] = parse_notes(value)
        elif model_field == "notes_middle":
            perfume["notes_middle"] = parse_notes(value)
        elif model_field == "notes_base":
            perfume["notes_base"] = parse_notes(value)
        elif model_field == "all_notes":
            perfume["all_notes"] = parse_notes(value)
        elif model_field == "description":
            perfume["description"] = str(value).strip()
    
    # Combine all notes if not already set
    if not perfume["all_notes"]:
        all_notes = perfume["notes_top"] + perfume["notes_middle"] + perfume["notes_base"]
        perfume["all_notes"] = list(set(all_notes))  # Remove duplicates
    
    return perfume


def detect_column_mapping(df: pd.DataFrame) -> Dict[str, str]:
    """Auto-detect column mapping based on common column names."""
    column_mapping = {}
    columns_lower = {col.lower(): col for col in df.columns}
    
    # Common mappings
    mappings = {
        "name": ["name", "perfume_name", "perfume name", "title", "نام"],
        "name_en": ["name_en", "name en", "english name", "name english", "perfume", "نام انگلیسی"],
        "name_fa": ["name_fa", "name fa", "persian name", "farsi name", "نام فارسی"],
        "brand": ["brand", "house", "manufacturer", "برند"],
        "collection": ["collection", "line", "series", "کالکشن"],
        "gender": ["gender", "target", "target_gender", "جنسیت"],
        "family": ["family", "olfactory_family", "olfactory family", "خانواده"],
        "season": ["season", "seasons", "best_season", "best season", "فصل"],
        "character": ["character", "style", "personality", "کاراکتر"],
        "intensity": ["intensity", "strength", "sillage", "شدت"],
        "notes_top": ["top_notes", "top notes", "top", "head notes", "head_notes", "نت‌های بالایی"],
        "notes_middle": ["middle_notes", "middle notes", "heart notes", "heart_notes", "heart", "نت‌های میانی"],
        "notes_base": ["base_notes", "base notes", "base", "drydown", "نت‌های پایانی"],
        "all_notes": ["notes", "all_notes", "all notes", "note", "نت‌ها"],
        "description": ["description", "desc", "about", "details", "توضیحات"],
    }
    
    for model_field, possible_names in mappings.items():
        for name in possible_names:
            if name in columns_lower:
                column_mapping[columns_lower[name]] = model_field
                break
    
    return column_mapping


def main():
    """Main parsing function."""
    # Paths
    project_root = Path(__file__).parent.parent
    excel_path = project_root / "perfume_database_cleaned.xlsx"
    output_dir = project_root / "data"
    output_file = output_dir / "parsed_perfumes.json"
    
    # Check if Excel file exists
    if not excel_path.exists():
        print(f"ERROR: Excel file not found: {excel_path}")
        sys.exit(1)
    
    # Create output directory
    output_dir.mkdir(exist_ok=True)
    
    print("=" * 80)
    print("PARSING EXCEL TO JSON")
    print("=" * 80)
    print(f"\nReading: {excel_path}")
    
    # Read Excel file
    try:
        df = pd.read_excel(excel_path)
    except Exception as e:
        print(f"ERROR: Failed to read Excel file: {e}")
        sys.exit(1)
    
    print(f"[OK] Loaded {len(df)} rows x {len(df.columns)} columns")
    
    # Display column information
    print("\n" + "=" * 80)
    print("COLUMN ANALYSIS")
    print("=" * 80)
    print(f"\nColumns ({len(df.columns)}):")
    for i, col in enumerate(df.columns, 1):
        non_null = df[col].notna().sum()
        print(f"  {i:2d}. {col:30s} ({non_null}/{len(df)} non-null)")
    
    # Detect column mapping
    print("\n" + "=" * 80)
    print("COLUMN MAPPING")
    print("=" * 80)
    column_mapping = detect_column_mapping(df)
    
    if not column_mapping:
        print("\n[WARNING] No columns could be auto-mapped!")
        print("Please review the column names and update the mapping manually.")
    else:
        print(f"\nMapped {len(column_mapping)} columns:")
        for excel_col, model_field in sorted(column_mapping.items()):
            print(f"  {excel_col:30s} -> {model_field}")
    
    unmapped = [col for col in df.columns if col not in column_mapping]
    if unmapped:
        print(f"\n[WARNING] Unmapped columns ({len(unmapped)}):")
        for col in unmapped:
            print(f"  - {col}")
    
    # Parse rows
    print("\n" + "=" * 80)
    print("PARSING DATA")
    print("=" * 80)
    
    perfumes = []
    errors = []
    
    for idx, row in df.iterrows():
        try:
            perfume = map_excel_to_perfume(row, column_mapping)
            # Only add if it has at least a name or brand
            if perfume["name_en"] or perfume["name_fa"] or perfume["brand"]:
                perfumes.append(perfume)
        except Exception as e:
            errors.append((idx + 2, str(e)))  # +2 because Excel is 1-indexed and has header
    
    print(f"\n[OK] Parsed {len(perfumes)} perfumes")
    if errors:
        print(f"[WARNING] {len(errors)} errors encountered")
        for row_num, error in errors[:5]:  # Show first 5 errors
            print(f"  Row {row_num}: {error}")
    
    # Statistics
    print("\n" + "=" * 80)
    print("DATA STATISTICS")
    print("=" * 80)
    
    stats = {
        "total_rows": len(df),
        "parsed_perfumes": len(perfumes),
        "with_brand": sum(1 for p in perfumes if p["brand"]),
        "with_name_en": sum(1 for p in perfumes if p["name_en"]),
        "with_name_fa": sum(1 for p in perfumes if p["name_fa"]),
        "with_gender": sum(1 for p in perfumes if p["gender"]),
        "with_notes_top": sum(1 for p in perfumes if p["notes_top"]),
        "with_notes_middle": sum(1 for p in perfumes if p["notes_middle"]),
        "with_notes_base": sum(1 for p in perfumes if p["notes_base"]),
        "with_seasons": sum(1 for p in perfumes if p["seasons"]),
    }
    
    for key, value in stats.items():
        print(f"  {key:20s}: {value}")
    
    # Save to JSON
    output_data = {
        "metadata": {
            "source_file": str(excel_path.name),
            "total_rows": len(df),
            "parsed_count": len(perfumes),
            "column_mapping": column_mapping,
            "unmapped_columns": unmapped,
            "statistics": stats,
        },
        "perfumes": perfumes,
    }
    
    print("\n" + "=" * 80)
    print("SAVING JSON")
    print("=" * 80)
    
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"\n[OK] Saved to: {output_file}")
        print(f"  File size: {output_file.stat().st_size / 1024:.1f} KB")
    except Exception as e:
        print(f"\n[ERROR] Failed to save JSON: {e}")
        sys.exit(1)
    
    # Show sample records
    print("\n" + "=" * 80)
    print("SAMPLE RECORDS (first 3)")
    print("=" * 80)
    for i, perfume in enumerate(perfumes[:3], 1):
        print(f"\n{i}. {perfume.get('brand', 'N/A')} - {perfume.get('name_en', perfume.get('name_fa', 'N/A'))}")
        if perfume.get("gender"):
            print(f"   Gender: {perfume['gender']}")
        if perfume.get("notes_top"):
            print(f"   Top notes: {', '.join(perfume['notes_top'][:3])}")
        if perfume.get("notes_middle"):
            print(f"   Middle notes: {', '.join(perfume['notes_middle'][:3])}")
        if perfume.get("notes_base"):
            print(f"   Base notes: {', '.join(perfume['notes_base'][:3])}")
    
    print("\n" + "=" * 80)
    print("[OK] PARSING COMPLETE")
    print("=" * 80)
    print(f"\nNext steps:")
    print(f"  1. Review the JSON file: {output_file}")
    print(f"  2. Check column mapping and update if needed")
    print(f"  3. Create import command to load into Django database")


if __name__ == "__main__":
    main()

