#!/usr/bin/env python3
"""Quick validation script for notes integration."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from api.notes_master import get_all_notes, get_notes_by_category, is_valid_note, validate_notes
from matcher.note_normalization import normalize_note_label

def main():
    print("Validating notes integration...")
    
    # Test 1: Load notes
    notes = get_all_notes()
    print(f"[OK] Loaded {len(notes)} notes")
    
    # Test 2: Load categories
    cats = get_notes_by_category()
    print(f"[OK] Loaded {len(cats)} categories")
    
    # Test 3: Validation
    test_notes = ['رز', 'وانیل', 'چوب صندل', 'قهوه', 'شکلات', 'invalid_note']
    valid, invalid = validate_notes(test_notes)
    print(f"[OK] Validation test: {len(valid)} valid, {len(invalid)} invalid")
    assert len(valid) == 5, "Should have 5 valid notes"
    assert len(invalid) == 1, "Should have 1 invalid note"
    
    # Test 4: Normalization
    test_cases = [
        ('رز', 'رز'),
        ('گل رز', 'رز'),
        ('وانیل', 'وانیل'),
        ('صندل', 'چوب صندل'),
    ]
    for input_note, expected in test_cases:
        result = normalize_note_label(input_note)
        assert result == expected, f"Normalization failed: {input_note} -> {result} (expected {expected})"
    print(f"[OK] Normalization test passed")
    
    # Test 5: Category distribution
    print("\nCategory distribution:")
    for cat in sorted(cats.keys()):
        if cats[cat]:
            print(f"  {cat}: {len(cats[cat])} notes")
    
    print("\n[SUCCESS] All validation tests passed!")

if __name__ == "__main__":
    main()

