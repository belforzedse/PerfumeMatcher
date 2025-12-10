"""
Stub helper to build a canonical notes_master.json from external datasets.

Expected inputs:
- Place CSVs under backend/data/, e.g. a Kaggle perfume notes dataset.
- Each CSV should have a column with note names (English). Configure COLUMN_CANDIDATES.

Usage:
    python -m matcher.notes_master_stub

Outputs:
- backend/matcher/notes_master.json with a sorted list of normalized note names.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Iterable, Set

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_PATH = Path(__file__).resolve().parent / "notes_master.json"

COLUMN_CANDIDATES = ["note", "notes", "accord", "accords", "Note", "Notes"]


def normalize(name: str) -> str:
    return " ".join(name.strip().lower().split())


def collect_notes() -> Set[str]:
    notes: Set[str] = set()
    if not DATA_DIR.exists():
        return notes

    for csv_path in DATA_DIR.glob("*.csv"):
        with csv_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                for col in COLUMN_CANDIDATES:
                    raw = row.get(col)
                    if not raw:
                        continue
                    # Split on commas/semicolons
                    parts = [p.strip() for p in raw.replace(";", ",").split(",") if p.strip()]
                    for part in parts:
                        notes.add(normalize(part))
    return notes


def main() -> None:
    notes = sorted(collect_notes())
    OUTPUT_PATH.write_text(json.dumps(notes, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(notes)} notes to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

