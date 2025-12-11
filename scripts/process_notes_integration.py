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

# Category detection patterns - order matters! More specific first
CATEGORY_PATTERNS = {
    # Gourmand - food-related, should come before sweet to catch specific items
    "gourmand": [
        r"قهوه", r"کاکائو", r"شکلات", r"بستنی", r"کاسترد", r"کیک", r"شیرینی",
        r"مارزیپان", r"نوقا", r"آجیل", r"بادام", r"فندق", r"گردو", r"پسته",
        r"ماکادمیا", r"آکای", r"جوز\s+هندی\s+گل", r"دانه\s+تونکا", r"شربت",
        r"شهد", r"ملاس", r"مارمالاد", r"کروسانت", r"بیسکویت", r"ماکارون",
        r"کرم\s+بادام", r"شیر\s+بادام", r"شیر\s+نارگیل", r"نان", r"پرالین",
        r"شکر\s+قهوه\s+ای", r"کارامل", r"دولچه\s+له\s+چه", r"برنج", r"باسماتی\s+برنج",
        r"جو", r"سبوس", r"مالت", r"تافی", r"خامه", r"کره", r"دانه\s+هویج",
        r"دانه\s+کرفس", r"نخود", r"سویا", r"مارچوبه",
    ],
    # Floral - broad category, many flowers
    "floral": [
        r"گل\b", r"شکوفه", r"گلبرگ", r"\bرز\b", r"\bیاس\b", r"یاسمن",
        r"صدتومانی", r"محمدی", r"شمعدانی", r"لادن", r"نرگس", r"مریم",
        r"بنفشه", r"لیلی", r"ارکیده", r"گاردنیا", r"فریزیا",
        r"لوتوس", r"نیلوفر", r"بهار\s+نارنج", r"لاله", r"شقایق",
        r"فرانجیپانی", r"ویستریا", r"ماگنولیا", r"میموزا", r"هورتنزیا",
        r"دیزی", r"سلوزیا", r"پانسی", r"ژربرا", r"گل\s+خطمی", r"ختمی",
        r"یاس\s+آب", r"یاس\s+مراکشی", r"یاس\s+هندی", r"یاس\s+مصری",
        r"آماریلیس", r"کاملیا", r"فوشیا", r"فراموشم\s+نکن", r"قاصدک",
        r"سوسن", r"زنبق", r"گل\s+زنگوله", r"گل\s+شکلاتی", r"گل\s+شور",
        r"رز\s+سفید", r"رز\s+قرمز", r"رز\s+صورتی", r"رز\s+زرد",
        r"سنبل", r"سنبل\s+الطیب", r"سیکلامن", r"عنبیه", r"داتورا",
        r"رودودندرون", r"لانتانا", r"لوپین", r"نارد", r"ناستورسیا",
        r"خشخاش\s+(زرد|قرمز|هیمالیا)", r"بوگنویل", r"استرلیتزیا",
        r"استفانوتیس", r"ادلوایس", r"تاج\s+خروس", r"کالیکانتوس",
        r"بروملیا", r"بورونیا", r"بودلیا", r"دافنه", r"فراگونیا",
        r"لابورنوم", r"پلارگونیوم", r"بنفش\b", r"بنفش\s+(سفید|صورتی|فرانسوی|پارما)",
        r"نرولی", r"اسانس\s+نرولی", r"آفتابگردان", r"خشخاش\b",
    ],
    # Fruity - fruits before they get misclassified
    "fruity": [
        r"میوه", r"سیب", r"گلابی", r"هلو", r"زردآلو", r"انگور", r"توت\s+فرنگی",
        r"تمشک", r"بلک\s+بری", r"انار", r"انجیر", r"خرمالو", r"لیچی", r"انبه",
        r"پاپایا", r"نارگیل", r"موز", r"آناناس", r"کیوی", r"زغال\s+اخته",
        r"آلبالو", r"گیلاس", r"شلیل", r"آلو", r"توت", r"شاه\s+توت",
        r"کارامولا", r"گواوا", r"چایوت", r"جابوتیکابا", r"آکای\s+بری",
        r"گوجی\s+بری", r"بلوبری", r"کرنبری", r"اسرولا", r"پیتانگا",
        r"آووکادو", r"ابر\s+بری", r"برف\s+بری", r"زالزالک", r"زرشک",
        r"خربزه", r"هندوانه", r"به\b", r"بوسن\s+بری", r"زمستان\s+بری",
        r"بائوباب", r"جک\s+فروت", r"ریواس", r"پاندانوس",
    ],
    # Citrus - before fruity (includes neroli/orange blossom which is citrus-floral)
    "citrus": [
        r"لیمو", r"پرتقال", r"ترنج", r"گریپ\s+فروت", r"نارنج", r"یوزو",
        r"کامکوات", r"پوملو", r"کلمانتین", r"ماندارین", r"نارنگی",
        r"لیموناد", r"لیمونچلو", r"پرتقال\s+تلخ", r"پرتقال\s+خونی",
        r"عسل\s+پرتقال", r"روغن\s+پرتقال", r"پوست\s+پرتقال", r"پوست\s+لیمو",
        r"نرولی", r"اسانس\s+نرولی", r"بهار\s+نارنج",
    ],
    # Sweet - general sweet notes
    "sweet": [
        r"شیرین", r"شکر", r"وانیل", r"تونکا", r"عسل", r"نارگیل\s+شیر",
        r"شیر", r"شکر\s+وانیلی",
    ],
    # Woody
    "woody": [
        r"چوب\b", r"درخت", r"صندل", r"سدر", r"عود", r"خس\s+خس", r"گایاک",
        r"وتیور", r"سرو", r"بلوط", r"کاج", r"راش", r"افرا", r"صنوبر",
        r"هینوکی", r"آگاروود", r"چوب\s+کهربا", r"چوب\s+رز", r"چوب\s+ساج",
        r"چوب\s+بادام", r"چوب\s+گیلاس", r"سکویا", r"ردوود", r"چوب\s+پنبه",
        r"بامبو", r"درخت\s+نخل", r"درخت\s+زیتون", r"درخت\s+کاج",
        r"آبنوس", r"آکیگالاوود", r"آروکاریا", r"آسپن", r"توس", r"زیون\s+چوبی",
        r"نخل\s+دید",
    ],
    # Spicy
    "spicy": [
        r"فلفل", r"دارچین", r"هل", r"زنجبیل", r"زیره", r"رازیانه",
        r"انیسون", r"کارداموم", r"زعفران", r"جوز\s+هندی", r"ادویه",
        r"پاپریکا", r"شنبلیله", r"گلپر", r"پونه\s+کوهی", r"سماق",
        r"میخک", r"میخک\s+(سفید|ماداگاسکار)",
    ],
    # Green/Herbal
    "green": [
        r"برگ\b", r"گیاهی", r"ریحان", r"نعنا", r"چای\s+سبز", r"اسطوخودوس",
        r"رزماری", r"مریم\s+گلی", r"آویشن", r"پونه", r"شوید", r"جعفری",
        r"ترخون", r"کوهی", r"گیاه", r"گشنیز", r"شنبلیله", r"شبدر",
        r"یونجه", r"علف", r"چمن", r"برگ\s+چای", r"برگ\s+ریحان",
        r"برگ\s+نعنا", r"برگ\s+لیمو", r"اکالیپتوس", r"افسنطین", r"بابونه",
        r"رازک", r"زوفا", r"اسمانتوس", r"بادرنجبویه", r"تولسی",
        r"جینسینگ", r"جینکو", r"حکیم", r"درمنه", r"سرخس", r"شمشاد",
        r"شیسو", r"شاهی", r"لیمنوفیلا\s+آروماتیکا",
    ],
    # Resinous - resins and balsams
    "resinous": [
        r"رزین", r"صمغ", r"بالم", r"بلسان", r"بنزوئین", r"تولو", r"لابدانوم",
        r"اوپوپوناکس", r"استایراکس", r"الوبانوم", r"الیبانوم", r"کوپال", r"الئومی",
        r"رزین\s+سیام", r"رزین\s+صنوبر", r"مر", r"مر\s+قرمز", r"لبدانوم",
        r"لوبان", r"تولسی",
    ],
    # Oriental - amber and incense
    "oriental": [
        r"کهربا", r"بخور", r"آمبر", r"آمبرتون", r"آمبروم", r"آمبروکسان",
        r"کهربا\s+از\s+تونس", r"کهربای\s+سفید", r"کهربای\s+سیاه",
        r"چوب\s+کهربا", r"بخور\s+مراکشی", r"بخور\s+هینوکی",
    ],
    # Aquatic/Marine
    "aquatic": [
        r"آب\b", r"دریا", r"اقیانوس", r"آبی\b", r"خزه", r"جلبک", r"دریایی",
        r"اقیانوسی", r"آب\s+دریا", r"آب\s+مقوی", r"آب\s+نبات", r"آب\s+کاکتوس",
        r"جلبک\s+دریایی", r"جلبک\s+قرمز", r"علف\s+دریایی", r"خزه\s+بلوط",
        r"اقیانوسی\s+نت", r"دریایی\s+نت", r"صدف", r"شبنم", r"قطره\s+شبنم",
        r"خلیج", r"اسانس\s+خلیج",
    ],
    # Earthy
    "earthy": [
        r"خاک", r"زمینی", r"پچولی", r"ترافل", r"زغال", r"خاکستر",
        r"خاک\s+رس", r"موس",         r"خزه\s+بلوط", r"خزه\s+تبتی", r"تنتور\s+خاک",
        r"پچولی\s+اندونزیایی", r"پچولی\s+هندی", r"پاتچولی",
        r"دود", r"هیزم",
    ],
    # Musky
    "musky": [
        r"مشک", r"کشمیر", r"ایریس", r"عنبر", r"آمبرت",
    ],
    # Powdery
    "powdery": [
        r"پودری", r"پودر", r"تالک", r"برنج\s+پودر", r"پودر\s+برنج",
        r"ایریس", r"پودر\s+تالک",
    ],
    # Tobacco
    "tobacco": [
        r"تنباکو", r"شکوفه\s+تنباکو", r"برگ\s+تنباکو", r"برگ\s+تنباکو\s+سفید",
        r"تنباکو\s+سبک",
    ],
    # Herbal/Medicinal - specific herbs and medicinal plants
    "herbal": [
        r"بابونه", r"افسنطین", r"جینسینگ", r"جینکو", r"حنا", r"دارواش",
        r"مهر\s+سلیمان", r"بومادران", r"بادرنجبویه", r"حکیم", r"بلادونا",
        r"شوکران", r"جاودانه", r"جاکاراندا", r"مانوکا", r"مانینکا",
        r"جین", r"هاساکو", r"هدر", r"هدیونه", r"هیراکس", r"ابسنت",
        r"راونسارا",
    ],
    # Beverages - alcoholic and non-alcoholic drinks
    "beverage": [
        r"شراب", r"شامپاین", r"براندی", r"تکیلا", r"ودکا", r"ویسکی",
        r"کنیاک", r"کومبارو", r"رام", r"دایکیری", r"مارتینی", r"موهیتو",
        r"لیموناد", r"کاپوچینو", r"هورچاتا", r"مشروب", r"کایپیرینیا",
        r"آمارتو", r"مادیرا", r"ورموت",
    ],
    # Synthetic/Chemical - synthetic fragrance notes
    "synthetic": [
        r"آلدئیدها", r"ایندول", r"آمیل\s+سالیسیلات", r"سیکوت\s+مصنوعی",
        r"سیتالوکس", r"لورنوکس", r"بورنئول", r"توسکانول", r"سیترون",
        r"آمبروکسان", r"آمبرتون", r"آمبروم", r"سافرالئین", r"نت\s+های",
    ],
    # Leather
    "leather": [
        r"چرم", r"چرم\s+روسی", r"چوب\s+چرم",
    ],
    # Mineral/Metallic
    "mineral": [
        r"فلز", r"آهن", r"آلومینیوم", r"سنگ", r"سنگ\s+چخماق", r"سنگریزه",
        r"صخره", r"مرجانی", r"خاک\s+رس", r"گچ", r"شن\s+و\s+ماسه", r"آسفالت",
        r"باروت", r"اخگر", r"سیدريت", r"سر\s+آبشار\s+فضایی", r"پاپیروس",
    ],
    # Animalic
    "animalic": [
        r"کاستوریوم", r"عنبر", r"یادداشت\s+های\s+حیوانی",
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


def should_filter_note(note: str) -> bool:
    """Filter out incomplete, invalid, or descriptor-only notes."""
    note = note.strip()
    
    # Filter out single characters or very short non-meaningful notes
    if len(note) <= 1:
        return True
    
    # Filter out incomplete notes (likely parsing errors)
    incomplete_patterns = [
        r"^[آ-ی]\s*$",  # Single character
        r"^\S+\s+شده\s*$",  # "something شده" - incomplete
        r"^[رنسه]\s*$",  # Single letters that appear to be truncations
        r"^[رنسه]\s+",  # Notes starting with single letter + space (unless it's a word)
        r"^[ه]\s*$",  # Single ه
        r"^[م]\s*$",  # Single م
        r"^[ن]\s*$",  # Single ن
        r"^[نه]\s*$",  # Just "نه"
        r"^[را]\s*$",  # Just "را"
        r"^[ره]\s*$",  # Just "ره"
        r"^[ریس]\s*$",  # Just "ریس"
        r"^[بد]\s*$",  # Just "بد"
        r"^[خصوصی]\s*$",  # Just "خصوصی" (private)
        r"^[خلا]\s*$",  # Just "خلا" (void)
    ]
    
    # Additional single character/letter patterns
    if note in ["ر", "س", "ه", "م", "ن", "را", "ره", "ریس", "بد", "خصوصی", "خلا", "هی", "نه"]:
        return True
    
    # Filter out notes that look like truncations (single letter + space + word)
    if re.match(r"^[آ-ی]\s+", note) and len(note.split()) == 2:
        # Check if it's a known pattern (like "ر تاهیتی" which should be filtered)
        truncation_patterns = [r"^[رنسه]\s+", r"^[ه]\s+"]
        for pattern in truncation_patterns:
            if re.match(pattern, note):
                return True
    for pattern in incomplete_patterns:
        if re.match(pattern, note):
            return True
    
    # Filter out pure color descriptors (unless they're part of a flower name)
    color_only = ["قرمز", "سفید", "سیاه", "زرد", "صورتی", "سبز", "آبی", "بنفش"]
    if note in color_only:
        return True
    
    # Filter out location descriptors only (without a noun)
    location_only = ["آفریقایی", "مصری", "هندی", "ایتالیایی", "فرانسوی", "تاهیتی"]
    if note in location_only:
        return True
    
    # Filter out very generic descriptors
    generic = ["توافق سبز", "دم دار", "مشت زدن", "میتی عطار", "مخملی"]
    if note in generic:
        return True
    
    # Filter out obvious typos/parsing errors
    typos = ["دداشت های باران", "دداشت های تند", "دداشت های حیوانی", "دداشت های خورشیدی"]
    if note in typos:
        return True
    
    return False


def categorize_note(note: str) -> str:
    """
    Categorize a note based on patterns.
    Returns category name or "other" if no match.
    Order matters - check more specific categories first.
    """
    # Filter out bad notes
    if should_filter_note(note):
        return "other"
    
    note_lower = note.lower()
    
    # Check each category's patterns (order matters - more specific first)
    for category, patterns in CATEGORY_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, note, re.IGNORECASE):
                # Additional checks for ambiguous cases
                if category == "floral" and "برگ" in note and "شکوفه" not in note and "گلبرگ" not in note:
                    # Skip leaves even if they have "گل" nearby, unless it's "شکوفه" or "گلبرگ"
                    continue
                if category == "green" and any(fruit in note for fruit in FRUITS):
                    # Fruits are fruity, not green
                    continue
                if category == "fruity" and "شکوفه" in note:
                    # Flower blossoms are floral, not fruity
                    continue
                if category == "sweet" and any(word in note for word in ["قهوه", "کاکائو", "شکلات", "آجیل", "بادام"]):
                    # These are gourmand, not just sweet
                    continue
                # Skip if it's just a color descriptor
                if category in ["floral", "fruity"] and note.strip() in ["قرمز", "سفید", "سیاه", "زرد", "صورتی"]:
                    continue
                return category
    
    # Special handling for specific notes
    if any(fruit in note for fruit in FRUITS) and "شکوفه" not in note:
        return "fruity"
    if any(flower in note for flower in FLOWERS):
        return "floral"
    
    # Check for common suffixes/prefixes
    if note.endswith("برگ") or note.startswith("برگ "):
        return "green"
    if "شکوفه" in note or note.startswith("گل ") or "گلبرگ" in note:
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
        # Try to import if file is valid Python
        import sys
        import importlib.util
        sys.path.insert(0, str(notes_master_path.parent.parent.parent))
        spec = importlib.util.spec_from_file_location("notes_master", notes_master_path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            try:
                spec.loader.exec_module(module)
                if hasattr(module, 'PREDEFINED_NOTES'):
                    existing.update(module.PREDEFINED_NOTES)
                    return existing
            except:
                pass
        
        # Fallback: parse the file
        with open(notes_master_path, "r", encoding="utf-8") as f:
            content = f.read()
            # Extract notes from PREDEFINED_NOTES list (only from first occurrence)
            # Find the PREDEFINED_NOTES = [ section
            match = re.search(r'PREDEFINED_NOTES\s*=\s*\[(.*?)\]', content, re.DOTALL)
            if match:
                notes_section = match.group(1)
                # Extract quoted strings
                matches = re.findall(r'"([^"]+)"', notes_section)
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
        "gourmand": [],
        "resinous": [],
        "tobacco": [],
        "leather": [],
        "mineral": [],
        "animalic": [],
        "herbal": [],
        "beverage": [],
        "synthetic": [],
        "other": [],
    }
    
    # Process translated_notes.txt
    filtered_count = 0
    with open(translated_notes_path, "r", encoding="utf-8") as f:
        for line in f:
            persian_note = extract_persian_note(line)
            if not persian_note:
                continue
            
            normalized = normalize_note_for_comparison(persian_note)
            
            # Filter out bad notes early - don't add them at all
            if should_filter_note(persian_note):
                filtered_count += 1
                continue
            
            # Check if already exists
            if normalized in existing_normalized:
                continue
            
            # Check for duplicates in new_notes
            if normalized in {normalize_note_for_comparison(n) for n in new_notes}:
                continue
            
            new_notes.append(persian_note)
            category = categorize_note(persian_note)
            categorized[category].append(persian_note)
    
    if filtered_count > 0:
        print(f"Filtered out {filtered_count} invalid/incomplete notes")
    
    # Merge existing notes (organized) with new notes
    # First, get existing notes by category from notes_master.py
    all_notes = list(existing_notes) + new_notes
    
    # Organize all notes by category
    all_categorized = {cat: [] for cat in categorized.keys()}
    
    # Categorize existing notes (filter bad ones)
    for note in existing_notes:
        if should_filter_note(note):
            continue  # Skip filtered notes
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
        "citrus", "floral", "fruity", "woody", "spicy", "sweet", "gourmand",
        "oriental", "resinous", "musky", "animalic", "green", "herbal",
        "aquatic", "earthy", "powdery", "tobacco", "leather", "mineral",
        "beverage", "synthetic", "balsamic", "other"
    ]
    
    category_names = {
        "citrus": "Citrus / Fresh",
        "floral": "Floral",
        "fruity": "Fruity",
        "woody": "Woody",
        "spicy": "Spicy",
        "sweet": "Sweet",
        "gourmand": "Gourmand / Food",
        "oriental": "Oriental / Amber",
        "resinous": "Resinous / Balsamic",
        "musky": "Musky",
        "animalic": "Animalic",
        "green": "Green / Herbal",
        "herbal": "Herbal / Medicinal",
        "aquatic": "Aquatic / Marine",
        "earthy": "Earthy / Mossy",
        "powdery": "Powdery",
        "tobacco": "Tobacco",
        "leather": "Leather",
        "mineral": "Mineral / Metallic",
        "beverage": "Beverages",
        "synthetic": "Synthetic / Chemical",
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

