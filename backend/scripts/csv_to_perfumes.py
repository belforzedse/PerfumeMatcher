"""
Convert Persian CSV ("عطرها  - Sheet1.csv") to perfumes.json for the matcher.

Mapping highlights:
- name: prefer English name (نام انگلیسی), fallback to Persian (نام فارسی).
- id: slug from brand + name (lowercase, underscores, alnum/underscore), fallback to perfume_{index}.
- gender: map مرد -> male, زن -> female, یونیسکس -> unisex (default to unisex if unknown).
- notes: split نت اولیه/میانی/پایانی on both Persian and English commas, trim, drop empties, keep Persian text.
- other fields: family=None, main_accords=[], seasons=[], occasions=[], intensity=None.

Outputs UTF-8 JSON with ensure_ascii=False and indent=2 to backend/perfumes.json.
"""

from __future__ import annotations

import csv
import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import List, Optional

BASE_DIR = Path(__file__).resolve().parents[1]
CSV_PATH = BASE_DIR / "عطرها  - Sheet1.csv"
OUTPUT_PATH = BASE_DIR / "perfumes.json"


@dataclass
class PerfumeRow:
  id: str
  name: str
  brand: str
  gender: Optional[str] = None
  family: Optional[str] = None
  main_accords: List[str] = field(default_factory=list)
  top_notes: List[str] = field(default_factory=list)
  heart_notes: List[str] = field(default_factory=list)
  base_notes: List[str] = field(default_factory=list)
  seasons: List[str] = field(default_factory=list)
  occasions: List[str] = field(default_factory=list)
  intensity: Optional[str] = None


GENDER_MAP = {
  "مرد": "male",
  "زن": "female",
  "یونیسکس": "unisex",
  "يونيسكس": "unisex",  # possible variant
}

NOTE_COLUMNS = {
  "نت اولیه": "top_notes",
  "نت میانی": "heart_notes",
  "نت پایانی": "base_notes",
}


def slugify(value: str) -> str:
  value = value.lower().strip()
  value = re.sub(r"[^\w]+", "_", value, flags=re.UNICODE)
  return value.strip("_")


def split_notes(raw: str | None) -> List[str]:
  if not raw:
    return []
  parts = re.split(r"[،,]", raw)
  cleaned = [p.strip() for p in parts if p and p.strip()]
  return cleaned


def map_gender(raw: str | None) -> str:
  if not raw:
    return "unisex"
  normalized = raw.strip()
  return GENDER_MAP.get(normalized, "unisex")


def load_rows() -> List[PerfumeRow]:
  if not CSV_PATH.exists():
    raise FileNotFoundError(f"CSV not found at {CSV_PATH}")

  with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as f:
    reader = csv.DictReader(f)
    perfumes: List[PerfumeRow] = []
    for idx, row in enumerate(reader):
      brand = (row.get("برند") or row.get("برند ") or "").strip()
      persian_name = (row.get("نام فارسی") or row.get("نام فارسی ") or "").strip()
      english_name = (row.get("نام انگلیسی") or row.get("نام انگلیسی ") or "").strip()

      name = english_name or persian_name
      if not name:
        name = f"Untitled {idx}"

      slug_source = f"{brand} {name}".strip()
      pid = slugify(slug_source) or f"perfume_{idx}"

      gender_raw = row.get("جنسیت") or row.get("جنسيت")
      gender = map_gender(gender_raw)

      notes: dict[str, List[str]] = {}
      for csv_col, field_name in NOTE_COLUMNS.items():
        notes[field_name] = split_notes(row.get(csv_col) or row.get(f"{csv_col} ") or "")

      perfumes.append(
        PerfumeRow(
          id=pid,
          name=name,
          brand=brand or "Unknown",
          gender=gender,
          top_notes=notes["top_notes"],
          heart_notes=notes["heart_notes"],
          base_notes=notes["base_notes"],
        )
      )
    return perfumes


def write_json(perfumes: List[PerfumeRow]) -> None:
  OUTPUT_PATH.write_text(
    json.dumps([asdict(p) for p in perfumes], ensure_ascii=False, indent=2),
    encoding="utf-8",
  )
  print(f"Wrote {len(perfumes)} perfumes to {OUTPUT_PATH}")


def main() -> None:
  perfumes = load_rows()
  write_json(perfumes)


if __name__ == "__main__":
  main()

