#!/usr/bin/env python3
"""Analyze notes in the 'other' category to find patterns for better categorization."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from api.notes_master import get_notes_by_category

def main():
    cats = get_notes_by_category()
    other = cats.get('other', [])
    
    print(f"Total notes in 'other' category: {len(other)}")
    print("\nSample of uncategorized notes (first 100):")
    for i, note in enumerate(sorted(other)[:100], 1):
        print(f"  {i}. {note}")

if __name__ == "__main__":
    main()







