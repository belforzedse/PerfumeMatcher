#!/usr/bin/env python3
"""
Process and integrate notes from translated_notes.txt into the notes_master.py system.

This script:
1. Parses translated_notes.txt
2. Extracts Persian notes (prioritizing Persian over English)
3. Deduplicates against existing notes
4. Auto-categorizes new notes
5. Generates updated notes_master.py content
"""

import re
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Category detection patterns
CATEGORY_PATTERNS = {
    "floral": [
        r"گل\b", r"شکوفه", r"گلبرگ", r"\bرز\b", r"\bیاس\b", r"یاسمن",
        r"صدتومانی", r"محمدی", r"شمعدانی", r"لادن", r"نرگس", r"مریم",
        r"بنفشه", r"میخک", r"لیلی", r"ارکیده", r"گاردنیا", r"فریزیا",
        r"لوتوس", r"نیلوفر", r"آبی", r"بهار", r"گل[یه]?[ای]?\s",
    ],
    "green": [
        r"برگ\b", r"گیاهی", r"ریحان", r"نعنا", r"چای\s+سبز", r"اسطوخودوس",
        r"رزماری", r"مریم\s+گلی", r"آویشن", r"پونه", r"شوید", r"جعفری",
        r"ترخون", r"پونه", r"کوهی", r"گیاه",
    ],
    "citrus": [
        r"لیمو", r"پرتقال", r"ترنج", r"گریپ\s+فروت", r"نارنج", r"یوزو",
        r"کامکوات", r"پوملو", r"کلایننتین", r"ماندارین",
    ],
    "fruity": [
        r"میوه", r"سیب", r"گلابی", r"هلو", r"زردآلو", r"انگور", r"توت\s+فرنگی",
        r"تمشک", r"بلک\s+بری", r"انار", r"انجیر", r"خرمالو", r"لیچی", r"انبه",
        r"پاپایا", r"نارگیل", r"موز", r"آناناس", r"کیوی", r"زغال\s+اخته",
        r"آلبالو", r"گیلاس", r"شلیل", r"آلو",
    ],
    "woody": [
        r"چوب\b", r"درخت", r"صندل", r"سدر", r"عود", r"خس\s+خس", r"گایاک",
        r"وتیور", r"سرو", r"بلوط", r"کاج", r"راش", r"افرا", r"سپروس",
        r"هینوکی", r"آگاروود", r"گایاک",
    ],
    "spicy": [
        r"فلفل", r"دارچین", r"هل", r"میخک", r"زنجبیل", r"زیره", r"رازیانه",
        r"انیسون", r"کارداموم", r"زعفران", r"جوز\s+هندی", r"ادویه",
    ],
    "sweet": [
        r"شیرین", r"شکر", r"کارامل", r"وانیل", r"تونکا", r"پرالین", r"عسل",
        r"شکلات", r"کاکائو", r"نوقا", r"مارزیپان", r"کاسترد", r"بستنی",
        r"دولچه", r"شیر",
    ],
    "oriental": [
        r"کهربا", r"بخور", r"عود", r"آمبر", r"لابدانوم", r"بنزوئین",
        r"اوپوپوناکس", r"استایراکس", r"الوبانوم", r"کاستوریوم", r"رزین",
        r"صمغ",
    ],
    "aquatic": [
        r"آب\b", r"دریا", r"اقیانوس", r"آبی\b", r"خزه", r"جلبک", r"دریایی",
        r"اقیانوسی", r"آب\s+دریا", r"آب\s+مقوی",
    ],
    "earthy": [
        r"خاک", r"زمینی", r"خزه", r"پچولی", r"ترافل", r"زغال", r"خاکستر",
        r"خاک\s+رس", r"موس",
    ],
    "musky": [
        r"مشک", r"کشمیر", r"ایریس", r"کاستوریوم", r"عنبر",
    ],
    "powdery": [
        r"پودری", r"پودر", r"تالک", r"برنج\s+پودر", r"پودر\s+برنج",
    ],
    "balsamic": [
        r"بالم", r"بلسان", r"بنزوئین", r"تولو",
    ],
}

FRUITS = {
    "سیب", "گلابی", "هلو", "زردآلو", "انگور", "توت فرنگی", "تمشک",
    "بلک بری", "انار", "انجیر", "خرمالو", "لیچی", "انبه", "پاپایا",
    "نارگیل", "موز", "آناناس", "کیوی", "زغال اخته", "آلبالو", "گیلاس",
    "شلیل", "آلو", "توت", "کارامولا", "گواوا", "چایوت", "جابوتیکابا",
}

FLOWERS = {
    "رز", "یاس", "یاسمن", "صدتومانی", "محمدی", "شمعدانی", "لادن",
    "نرگس", "مریم", "بنفشه", "لیلی", "ارکیده", "گاردنیا", "فریزیا",
    "لوتوس", "نیلوفر", "گل", "میموزا", "ماگنولیا", "ویستریا",
}


def extract_persian_note(line: str) -> str:
    """
    Extract Persian note from a line that may contain:
    - Only Persian: "رز"
    - Only English: "rose"
    - Both: "chimonanthus یا زمستان شیرین"
    """
    line = line.strip()
    if not line:
        return ""
    
    # If line contains "یا", extract the part after it (usually Persian)
    if "یا" in line:
        parts = line.split("یا", 1)
        if len(parts) == 2:
            persian_part = parts[1].strip()
            # Clean up parentheses and extra text
            persian_part = re.sub(r"\([^)]*\)", "", persian_part).strip()
            # Clean trailing parentheses without matching pair
            persian_part = re.sub(r"\)\s*$", "", persian_part).strip()
            if persian_part and any("\u0600" <= c <= "\u06FF" for c in persian_part):
                return persian_part
    
    # Check if line contains Persian characters
    has_persian = any("\u0600" <= c <= "\u06FF" for c in line)
    
    if has_persian:
        # Clean up common patterns
        # Remove parenthetical English text: "آگاروود (عود)" -> "آگاروود" or "عود"
        # But preserve Persian in parentheses like "آمبرت (ملو مشک)" -> extract "آمبرت (ملو مشک)" or just "آمبرت"
        line_clean = line
        # Remove trailing unmatched parentheses
        line_clean = re.sub(r"\)\s*$", "", line_clean).strip()
        # For lines with Persian in parentheses, we might want to extract both
        # For now, just remove English-only parentheses
        # Check if parentheses contain Persian
        paren_match = re.search(r"\(([^)]+)\)", line_clean)
        if paren_match:
            paren_content = paren_match.group(1)
            # If parentheses contain only English, remove them
            if not any("\u0600" <= c <= "\u06FF" for c in paren_content):
                line_clean = re.sub(r"\([^)]*\)", "", line_clean).strip()
        
        # Remove trailing English words if separated
        words = line_clean.split()
        persian_words = [w for w in words if any("\u0600" <= c <= "\u06FF" for c in w)]
        if persian_words:
            result = " ".join(persian_words)
            # Clean trailing unmatched parentheses again
            result = re.sub(r"\)\s*$", "", result).strip()
            return result
        return line_clean
    
    # If only English, return empty (we'll skip these for now)
    return ""


def categorize_note(note: str) -> str:
    """
    Categorize a note based on patterns.
    Returns category name or "other" if no match.
    """
    note_lower = note.lower()
    
    # Check each category's patterns
    for category, patterns in CATEGORY_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, note, re.IGNORECASE):
                # Additional checks for ambiguous cases
                if category == "floral" and "برگ" in note:
                    # Skip leaves even if they have "گل" nearby
                    continue
                if category == "green" and any(fruit in note for fruit in FRUITS):
                    # Fruits are fruity, not green
                    continue
                return category
    
    # Special handling for specific notes
    if any(fruit in note for fruit in FRUITS):
        return "fruity"
    if any(flower in note for flower in FLOWERS):
        return "floral"
    
    return "other"


def normalize_note_for_comparison(note: str) -> str:
    """Normalize note for deduplication comparison."""
    # Remove common variations
    note = note.strip()
    # Remove extra spaces
    note = re.sub(r"\s+", " ", note)
    return note


def load_existing_notes(notes_master_path: Path) -> Set[str]:
    """Load existing notes from notes_master.py"""
    existing = set()
    try:
        with open(notes_master_path, "r", encoding="utf-8") as f:
            content = f.read()
            # Extract notes from PREDEFINED_NOTES list
            # Simple regex to find all quoted strings in the list
            matches = re.findall(r'"([^"]+)"', content)
            existing.update(matches)
    except Exception as e:
        print(f"Warning: Could not load existing notes: {e}")
    return existing


def process_notes_file(
    translated_notes_path: Path,
    notes_master_path: Path
) -> Tuple[List[str], Dict[str, List[str]]]:
    """
    Process translated_notes.txt and return:
    - All unique notes (existing + new)
    - Notes organized by category
    """
    existing_notes = load_existing_notes(notes_master_path)
    existing_normalized = {normalize_note_for_comparison(n) for n in existing_notes}
    
    new_notes: List[str] = []
    categorized: Dict[str, List[str]] = {
        "citrus": [],
        "floral": [],
        "woody": [],
        "spicy": [],
        "sweet": [],
        "oriental": [],
        "musky": [],
        "green": [],
        "aquatic": [],
        "fruity": [],
        "earthy": [],
        "powdery": [],
        "balsamic": [],
        "other": [],
    }
    
    # Process translated_notes.txt
    with open(translated_notes_path, "r", encoding="utf-8") as f:
        for line in f:
            persian_note = extract_persian_note(line)
            if not persian_note:
                continue
            
            normalized = normalize_note_for_comparison(persian_note)
            
            # Check if already exists
            if normalized in existing_normalized:
                continue
            
            # Check for duplicates in new_notes
            if normalized in {normalize_note_for_comparison(n) for n in new_notes}:
                continue
            
            new_notes.append(persian_note)
            category = categorize_note(persian_note)
            categorized[category].append(persian_note)
    
    # Merge existing notes (organized) with new notes
    # First, get existing notes by category from notes_master.py
    all_notes = list(existing_notes) + new_notes
    
    # Organize all notes by category
    all_categorized = {cat: [] for cat in categorized.keys()}
    
    # Categorize existing notes
    for note in existing_notes:
        cat = categorize_note(note)
        if note not in all_categorized[cat]:
            all_categorized[cat].append(note)
    
    # Add new notes
    for cat, notes in categorized.items():
        for note in notes:
            if note not in all_categorized[cat]:
                all_categorized[cat].append(note)
    
    return all_notes, all_categorized


def generate_notes_master_content(
    all_notes: List[str],
    categorized: Dict[str, List[str]]
) -> str:
    """Generate the updated notes_master.py file content."""
    
    # Build the file content
    lines = [
        '"""',
        "Master list of predefined perfume notes in Persian.",
        "This ensures consistency and improves matching accuracy.",
        '"""',
        "",
        "# Comprehensive list of perfume notes organized by category",
        "PREDEFINED_NOTES = [",
    ]
    
    # Add notes organized by category
    category_order = [
        "citrus", "floral", "woody", "spicy", "sweet", "oriental",
        "musky", "green", "aquatic", "fruity", "earthy", "powdery",
        "balsamic", "other"
    ]
    
    category_names = {
        "citrus": "Citrus / Fresh",
        "floral": "Floral",
        "woody": "Woody",
        "spicy": "Spicy",
        "sweet": "Sweet / Gourmand",
        "oriental": "Oriental / Amber",
        "musky": "Musky / Animalic",
        "green": "Green / Herbal",
        "aquatic": "Aquatic / Marine",
        "fruity": "Fruity",
        "earthy": "Earthy / Mossy",
        "powdery": "Powdery",
        "balsamic": "Balsamic",
        "other": "Other",
    }
    
    for cat in category_order:
        notes_list = sorted(set(categorized.get(cat, [])))
        if not notes_list:
            continue
        
        lines.append(f"    # {category_names.get(cat, 'Other')}")
        for note in notes_list:
            lines.append(f'    "{note}",')
        lines.append("")
    
    # Remove the last empty line before closing bracket
    if lines[-1] == "":
        lines.pop()
    
    lines.append("]")
    lines.append("")
    lines.append("# Notes organized by category for easier selection in admin panel")
    lines.append("NOTES_BY_CATEGORY = {")
    
    for cat in category_order:
        notes_list = sorted(set(categorized.get(cat, [])))
        if not notes_list:
            continue
        lines.append(f'    "{cat}": [')
        for note in notes_list:
            lines.append(f'        "{note}",')
        lines.append("    ],")
        lines.append("")
    
    # Remove the last empty line before closing brace
    if lines[-1] == "":
        lines.pop()
    
    lines.append("}")
    lines.append("")
    lines.extend([
        "",
        "def get_all_notes() -> list[str]:",
        '    """Return sorted list of all predefined notes."""',
        "    return sorted(PREDEFINED_NOTES)",
        "",
        "",
        "def get_notes_by_category() -> dict[str, list[str]]:",
        '    """Return notes organized by category."""',
        "    return NOTES_BY_CATEGORY",
        "",
        "",
        "def is_valid_note(note: str) -> bool:",
        '    """Check if a note is in the predefined list."""',
        "    return note.strip() in PREDEFINED_NOTES",
        "",
        "",
        "def validate_notes(notes: list[str]) -> tuple[list[str], list[str]]:",
        '    """',
        "    Validate a list of notes.",
        "    Returns: (valid_notes, invalid_notes)",
        '    """',
        "    valid = []",
        "    invalid = []",
        "    for note in notes:",
        "        if is_valid_note(note):",
        "            valid.append(note.strip())",
        "        else:",
        "            invalid.append(note)",
        "    return valid, invalid",
        "",
    ])
    
    return "\n".join(lines)


def main():
    """Main entry point."""
    # Determine paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    translated_notes_path = project_root / "data" / "translated_notes.txt"
    notes_master_path = project_root / "backend" / "api" / "notes_master.py"
    output_path = project_root / "backend" / "api" / "notes_master_new.py"
    
    print(f"Processing {translated_notes_path}...")
    print(f"Loading existing notes from {notes_master_path}...")
    
    all_notes, categorized = process_notes_file(translated_notes_path, notes_master_path)
    
    print(f"\nFound {len(all_notes)} total unique notes")
    print(f"New notes added: {len(all_notes) - len(load_existing_notes(notes_master_path))}")
    print("\nNotes by category:")
    for cat, notes_list in categorized.items():
        if notes_list:
            print(f"  {cat}: {len(notes_list)}")
    
    # Generate new content
    new_content = generate_notes_master_content(all_notes, categorized)
    
    # Write to new file first for review
    output_path.write_text(new_content, encoding="utf-8")
    print(f"\nGenerated new notes_master.py content written to: {output_path}")
    print("Review the file and then replace the original if satisfied.")


if __name__ == "__main__":
    main()

