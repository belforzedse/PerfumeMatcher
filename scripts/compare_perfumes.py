#!/usr/bin/env python3
"""
Check if existing perfumes exist in the parsed dataset.
Simple text search (like Ctrl+F) to find matches.
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Set
from difflib import SequenceMatcher


def normalize_text(text: str) -> str:
    """Normalize text for comparison (lowercase, strip, remove extra spaces)."""
    if not text:
        return ""
    return " ".join(str(text).lower().strip().split())


def fuzzy_similarity(a: str, b: str) -> float:
    """Calculate fuzzy similarity ratio between two strings (0.0 to 1.0)."""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, normalize_text(a), normalize_text(b)).ratio()


def find_matches(
    existing_perfumes: List[Dict],
    parsed_perfumes: List[Dict],
    fuzzy_threshold: float = 0.7
) -> tuple[List[Dict], List[Dict]]:
    """
    Find if existing perfumes exist in parsed dataset.
    Uses: 1) Exact match, 2) Text search (substring), 3) Fuzzy matching.
    Returns: (found, not_found)
    """
    found = []
    not_found = []
    
    # Create a set of all brand+name combinations from parsed dataset for fast lookup
    parsed_set: Set[str] = set()
    parsed_by_key: Dict[str, List[Dict]] = {}
    
    for p in parsed_perfumes:
        brand = normalize_text(p.get("brand", ""))
        name = normalize_text(p.get("name_en", "") or p.get("name_fa", "") or p.get("name", ""))
        key = f"{brand}|{name}"
        parsed_set.add(key)
        if key not in parsed_by_key:
            parsed_by_key[key] = []
        parsed_by_key[key].append(p)
    
    # Also create a simple text search index (all text combined)
    parsed_text_index: List[Dict] = parsed_perfumes
    
    for existing in existing_perfumes:
        existing_brand = normalize_text(existing.get("brand", ""))
        existing_name_en = normalize_text(existing.get("name_en", ""))
        existing_name_fa = normalize_text(existing.get("name_fa", ""))
        existing_name = existing_name_en or existing_name_fa or normalize_text(existing.get("name", ""))
        
        if not existing_brand and not existing_name:
            continue
        
        # Try exact match first (brand + name)
        exact_key = f"{existing_brand}|{existing_name}"
        matched = False
        best_match = None
        best_similarity = 0.0
        match_type = None
        
        if exact_key in parsed_set:
            # Exact match found
            for parsed in parsed_by_key[exact_key]:
                found.append({
                    "existing": existing,
                    "parsed": parsed,
                    "match_type": "exact",
                    "similarity": 1.0,
                })
            matched = True
        else:
            # Try fuzzy matching first (handles variations better)
            for parsed in parsed_text_index:
                parsed_brand = normalize_text(parsed.get("brand", ""))
                parsed_name = normalize_text(parsed.get("name_en", "") or parsed.get("name_fa", "") or parsed.get("name", ""))
                
                # Calculate brand similarity
                brand_sim = fuzzy_similarity(existing_brand, parsed_brand) if existing_brand and parsed_brand else 0.0
                
                # Calculate name similarity
                name_sim = fuzzy_similarity(existing_name, parsed_name) if existing_name and parsed_name else 0.0
                
                # Combined similarity (weighted: 40% brand, 60% name)
                combined_sim = (brand_sim * 0.4 + name_sim * 0.6) if (brand_sim > 0 or name_sim > 0) else 0.0
                
                if combined_sim > best_similarity and combined_sim >= fuzzy_threshold:
                    best_similarity = combined_sim
                    best_match = parsed
                    match_type = "fuzzy"
            
            # If fuzzy found a good match, use it
            if best_match and best_similarity >= fuzzy_threshold:
                found.append({
                    "existing": existing,
                    "parsed": best_match,
                    "match_type": match_type,
                    "similarity": best_similarity,
                })
                matched = True
            else:
                # Fallback to text search (substring match) - more strict
                existing_search_text = existing_name.lower() if existing_name else ""
                
                for parsed in parsed_text_index:
                    parsed_brand = normalize_text(parsed.get("brand", ""))
                    parsed_name = normalize_text(parsed.get("name_en", "") or parsed.get("name_fa", "") or parsed.get("name", ""))
                    parsed_full_text = f"{parsed_brand} {parsed_name}".lower()
                    
                    # Check if existing name appears in parsed text (like Ctrl+F)
                    # But only if it's a meaningful substring (at least 3 chars)
                    if existing_search_text and len(existing_search_text) >= 3 and existing_search_text in parsed_full_text:
                        found.append({
                            "existing": existing,
                            "parsed": parsed,
                            "match_type": "text_search",
                            "similarity": 1.0,  # Substring match = 100%
                        })
                        matched = True
                        break  # Found one match, move to next existing perfume
        
        if not matched:
            not_found.append(existing)
    
    return found, not_found


def main():
    """Main comparison function."""
    import sys
    import io
    # Set UTF-8 encoding for stdout
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    
    project_root = Path(__file__).parent.parent
    
    # Paths
    existing_data_path = project_root / "frontend" / "public" / "data" / "data.json"
    parsed_data_path = project_root / "data" / "parsed_perfumes.json"
    
    print("=" * 80)
    print("COMPARING EXISTING PERFUMES WITH PARSED DATASET")
    print("=" * 80)
    
    # Load existing perfumes
    print(f"\nLoading existing perfumes from: {existing_data_path}")
    if not existing_data_path.exists():
        print(f"[ERROR] File not found: {existing_data_path}")
        sys.exit(1)
    
    try:
        with open(existing_data_path, "r", encoding="utf-8") as f:
            existing_data = json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to load existing data: {e}")
        sys.exit(1)
    
    existing_perfumes = existing_data.get("perfumes", [])
    existing_brands = {b["id"]: b.get("name", "") for b in existing_data.get("brands", [])}
    existing_collections = {c["id"]: c.get("name", "") for c in existing_data.get("collections", [])}
    
    # Map brand/collection IDs to names
    for perfume in existing_perfumes:
        if "brand" in perfume and isinstance(perfume["brand"], int):
            perfume["brand"] = existing_brands.get(perfume["brand"], "")
        if "collection" in perfume and isinstance(perfume["collection"], int):
            perfume["collection"] = existing_collections.get(perfume["collection"], "")
    
    print(f"[OK] Loaded {len(existing_perfumes)} existing perfumes")
    
    # Load parsed perfumes
    print(f"\nLoading parsed dataset from: {parsed_data_path}")
    if not parsed_data_path.exists():
        print(f"[ERROR] File not found: {parsed_data_path}")
        print("Run scripts/parse_excel_to_json.py first!")
        sys.exit(1)
    
    try:
        with open(parsed_data_path, "r", encoding="utf-8") as f:
            parsed_data = json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to load parsed data: {e}")
        sys.exit(1)
    
    parsed_perfumes = parsed_data.get("perfumes", [])
    print(f"[OK] Loaded {len(parsed_perfumes)} parsed perfumes")
    
    # Find matches
    print("\n" + "=" * 80)
    print("SEARCHING FOR EXISTING PERFUMES IN DATASET")
    print("=" * 80)
    print(f"\nSearching {len(existing_perfumes)} existing perfumes in {len(parsed_perfumes)} parsed perfumes...")
    
    found, not_found = find_matches(existing_perfumes, parsed_perfumes, fuzzy_threshold=0.7)
    
    print("[OK] Search complete!")
    
    # Statistics
    print("\n" + "=" * 80)
    print("RESULTS")
    print("=" * 80)
    
    total_existing = len(existing_perfumes)
    total_found = len(found)
    total_not_found = len(not_found)
    
    print(f"\nTotal existing perfumes: {total_existing}")
    print(f"  Found in dataset:     {total_found:5d} ({total_found/total_existing*100:.1f}%)")
    print(f"  Not found:            {total_not_found:5d} ({total_not_found/total_existing*100:.1f}%)")
    
    # Group by match type
    exact_matches = [m for m in found if m["match_type"] == "exact"]
    text_matches = [m for m in found if m["match_type"] == "text_search"]
    fuzzy_matches = [m for m in found if m["match_type"] == "fuzzy"]
    
    print(f"\nBreakdown by match type:")
    if exact_matches:
        print(f"  - Exact matches:      {len(exact_matches):5d}")
    if text_matches:
        print(f"  - Text search matches: {len(text_matches):5d}")
    if fuzzy_matches:
        print(f"  - Fuzzy matches:     {len(fuzzy_matches):5d} (>=70% similarity)")
    
    # Show sample found matches
    if found:
        print("\n" + "=" * 80)
        print("SAMPLE FOUND MATCHES (first 15)")
        print("=" * 80)
        for i, match in enumerate(found[:15], 1):
            existing = match["existing"]
            parsed = match["parsed"]
            brand = existing.get("brand", "N/A") or "N/A"
            name = existing.get("name_fa") or existing.get("name_en", "N/A") or "N/A"
            match_type = match["match_type"]
            similarity = match.get("similarity", 0.0)
            parsed_brand = parsed.get("brand", "N/A") or "N/A"
            parsed_name = parsed.get("name_en", "N/A") or "N/A"
            try:
                print(f"\n{i}. {brand} - {name}")
                if match_type == "fuzzy":
                    print(f"   -> Found: {parsed_brand} - {parsed_name} ({match_type}, {similarity:.0%})")
                else:
                    print(f"   -> Found: {parsed_brand} - {parsed_name} ({match_type})")
            except UnicodeEncodeError:
                # Fallback for Windows console encoding issues
                sim_str = f", {similarity:.0%}" if match_type == "fuzzy" else ""
                print(f"\n{i}. [Brand: {brand[:30]}...] - [Name: {name[:30]}...]")
                print(f"   -> Found: [Brand: {parsed_brand[:30]}...] - [Name: {parsed_name[:30]}...] ({match_type}{sim_str})")
    
    # Show sample not found
    if not_found:
        print("\n" + "=" * 80)
        print("SAMPLE NOT FOUND (first 15)")
        print("=" * 80)
        for i, perfume in enumerate(not_found[:15], 1):
            brand = perfume.get("brand", "N/A") or "N/A"
            name = perfume.get("name_fa") or perfume.get("name_en", "N/A") or "N/A"
            try:
                print(f"{i}. {brand} - {name}")
            except UnicodeEncodeError:
                print(f"{i}. [Brand: {brand[:30]}...] - [Name: {name[:30]}...]")
    
    # Save detailed results
    output_file = project_root / "data" / "comparison_results.json"
    results = {
        "statistics": {
            "total_existing": total_existing,
            "found": total_found,
            "not_found": total_not_found,
            "found_percentage": (total_found / total_existing * 100) if total_existing > 0 else 0,
            "exact_matches": len(exact_matches),
            "text_search_matches": len(text_matches),
            "fuzzy_matches": len(fuzzy_matches),
        },
        "found": [
            {
                "existing": {
                    "brand": m["existing"].get("brand"),
                    "name_en": m["existing"].get("name_en"),
                    "name_fa": m["existing"].get("name_fa"),
                },
                "parsed": {
                    "brand": m["parsed"].get("brand"),
                    "name_en": m["parsed"].get("name_en"),
                },
                "match_type": m["match_type"],
                "similarity": m.get("similarity", 1.0),
            }
            for m in found
        ],
        "not_found": [
            {
                "brand": p.get("brand"),
                "name_en": p.get("name_en"),
                "name_fa": p.get("name_fa"),
            }
            for p in not_found
        ],
    }
    
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n[OK] Detailed results saved to: {output_file}")
    except Exception as e:
        print(f"\n[WARNING] Failed to save results: {e}")
    
    print("\n" + "=" * 80)
    print("[OK] COMPARISON COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()

