#!/usr/bin/env python3
"""
Extract all unique notes from the parsed perfume dataset.
Outputs a clean list of notes without duplicates.
"""

import json
import sys
from pathlib import Path
from typing import List, Set
from collections import Counter


def normalize_note(note: str) -> str:
    """Normalize a note for comparison (lowercase, strip, remove extra spaces)."""
    if not note:
        return ""
    # Remove common punctuation and extra spaces
    note = str(note).strip().lower()
    # Remove trailing punctuation
    note = note.rstrip(".,;:!?")
    # Normalize spaces
    note = " ".join(note.split())
    return note


def extract_all_notes(parsed_data_path: Path) -> tuple[List[str], Counter]:
    """
    Extract all notes from the parsed dataset.
    Returns: (unique_notes_sorted, note_frequency)
    """
    print(f"Loading parsed dataset from: {parsed_data_path}")
    
    try:
        with open(parsed_data_path, "r", encoding="utf-8") as f:
            parsed_data = json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to load parsed data: {e}")
        sys.exit(1)
    
    perfumes = parsed_data.get("perfumes", [])
    print(f"[OK] Loaded {len(perfumes)} perfumes")
    
    # Extract all notes
    all_notes_raw: List[str] = []
    note_frequency = Counter()
    
    print("\nExtracting notes from perfumes...")
    for i, perfume in enumerate(perfumes):
        # Get notes from all_notes field
        notes = perfume.get("all_notes", [])
        if isinstance(notes, list):
            for note in notes:
                if note:  # Skip empty notes
                    normalized = normalize_note(str(note))
                    if normalized:  # Only add if normalized note is not empty
                        all_notes_raw.append(normalized)
                        note_frequency[normalized] += 1
        
        # Also check notes_top, notes_middle, notes_base if all_notes is empty
        if not notes:
            for field in ["notes_top", "notes_middle", "notes_base"]:
                field_notes = perfume.get(field, [])
                if isinstance(field_notes, list):
                    for note in field_notes:
                        if note:
                            normalized = normalize_note(str(note))
                            if normalized:
                                all_notes_raw.append(normalized)
                                note_frequency[normalized] += 1
        
        # Progress indicator
        if (i + 1) % 5000 == 0:
            print(f"  Processed {i + 1}/{len(perfumes)} perfumes...")
    
    # Get unique notes (sorted)
    unique_notes = sorted(set(all_notes_raw))
    
    print(f"\n[OK] Extracted {len(all_notes_raw)} total notes")
    print(f"[OK] Found {len(unique_notes)} unique notes")
    
    return unique_notes, note_frequency


def main():
    """Main extraction function."""
    project_root = Path(__file__).parent.parent
    
    # Paths
    parsed_data_path = project_root / "data" / "parsed_perfumes.json"
    output_file = project_root / "data" / "extracted_notes.json"
    output_txt = project_root / "data" / "extracted_notes.txt"
    
    print("=" * 80)
    print("EXTRACTING UNIQUE NOTES FROM DATASET")
    print("=" * 80)
    
    if not parsed_data_path.exists():
        print(f"[ERROR] File not found: {parsed_data_path}")
        print("Run scripts/parse_excel_to_json.py first!")
        sys.exit(1)
    
    # Extract notes
    unique_notes, note_frequency = extract_all_notes(parsed_data_path)
    
    # Statistics
    print("\n" + "=" * 80)
    print("NOTE STATISTICS")
    print("=" * 80)
    
    total_occurrences = sum(note_frequency.values())
    print(f"\nTotal note occurrences: {total_occurrences}")
    print(f"Unique notes: {len(unique_notes)}")
    print(f"Average occurrences per note: {total_occurrences / len(unique_notes):.1f}")
    
    # Top 20 most common notes
    print("\nTop 20 most common notes:")
    for i, (note, count) in enumerate(note_frequency.most_common(20), 1):
        percentage = (count / total_occurrences) * 100
        print(f"  {i:2d}. {note:40s} ({count:5d} times, {percentage:5.2f}%)")
    
    # Save as JSON
    output_data = {
        "metadata": {
            "source": "parsed_perfumes.json",
            "total_perfumes": len(json.load(open(parsed_data_path, encoding="utf-8")).get("perfumes", [])),
            "total_note_occurrences": total_occurrences,
            "unique_notes_count": len(unique_notes),
        },
        "notes": unique_notes,
        "note_frequency": dict(note_frequency.most_common()),
    }
    
    print("\n" + "=" * 80)
    print("SAVING RESULTS")
    print("=" * 80)
    
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"[OK] Saved JSON to: {output_file}")
        print(f"  File size: {output_file.stat().st_size / 1024:.1f} KB")
    except Exception as e:
        print(f"[ERROR] Failed to save JSON: {e}")
        sys.exit(1)
    
    # Also save as simple text file (one note per line)
    try:
        with open(output_txt, "w", encoding="utf-8") as f:
            for note in unique_notes:
                f.write(f"{note}\n")
        print(f"[OK] Saved text file to: {output_txt}")
        print(f"  File size: {output_txt.stat().st_size / 1024:.1f} KB")
    except Exception as e:
        print(f"[WARNING] Failed to save text file: {e}")
    
    # Show sample notes
    print("\n" + "=" * 80)
    print("SAMPLE NOTES (first 30)")
    print("=" * 80)
    for i, note in enumerate(unique_notes[:30], 1):
        count = note_frequency[note]
        print(f"  {i:2d}. {note:40s} ({count} times)")
    
    print("\n" + "=" * 80)
    print("[OK] EXTRACTION COMPLETE")
    print("=" * 80)
    print(f"\nNext steps:")
    print(f"  1. Review extracted notes: {output_file}")
    print(f"  2. Compare with predefined notes in backend/api/notes_master.py")
    print(f"  3. Add missing notes to the predefined list if needed")


if __name__ == "__main__":
    main()








