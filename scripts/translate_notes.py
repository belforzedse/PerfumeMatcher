#!/usr/bin/env python3
"""
Translate extracted English notes to Persian using translation libraries.
Creates a translation mapping and optionally updates notes_master.py.
"""

import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Set, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from deep_translator import GoogleTranslator

try:
    from deep_translator import GoogleTranslator
    TRANSLATOR_AVAILABLE = True
except ImportError as e:
    TRANSLATOR_AVAILABLE = False
    GoogleTranslator = None  # type: ignore
    _import_error = str(e)


def load_existing_persian_notes() -> Set[str]:
    """Load existing Persian notes from notes_master.py."""
    notes_master_path = Path(__file__).parent.parent / "backend" / "api" / "notes_master.py"
    
    if not notes_master_path.exists():
        return set()
    
    try:
        # Read the file and extract PREDEFINED_NOTES
        with open(notes_master_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Simple extraction - look for the list
        notes = set()
        in_list = False
        for line in content.split("\n"):
            if "PREDEFINED_NOTES = [" in line:
                in_list = True
                continue
            if in_list:
                if line.strip().startswith("]"):
                    break
                # Extract quoted strings
                if '"' in line or "'" in line:
                    # Find quoted content
                    for quote_char in ['"', "'"]:
                        if quote_char in line:
                            start = line.find(quote_char) + 1
                            end = line.find(quote_char, start)
                            if end > start:
                                note = line[start:end].strip()
                                if note:
                                    notes.add(note)
        
        return notes
    except Exception as e:
        print(f"[WARNING] Could not load existing Persian notes: {e}")
        return set()


def translate_note(
    translator: "GoogleTranslator",
    note: str,
    retries: int = 3,
    delay: float = 1.0
) -> Optional[str]:
    """
    Translate a single note from English to Persian.
    Returns the translated note or None if translation fails.
    """
    for attempt in range(retries):
        try:
            # Google Translate has rate limits, so add small delay
            if attempt > 0:
                time.sleep(delay * (attempt + 1))
            
            translation = translator.translate(note)
            return translation.strip()
            
        except Exception as e:
            if attempt < retries - 1:
                print(f"    [RETRY] Attempt {attempt + 1}/{retries} for '{note}': {e}")
                continue
            else:
                print(f"    [ERROR] Failed to translate '{note}': {e}")
                return None
    
    return None


def translate_notes(
    translator: "GoogleTranslator",
    english_notes: List[str],
    delay_between_notes: float = 0.1
) -> Dict[str, str]:
    """
    Translate English notes to Persian one by one.
    Returns: {english_note: persian_note}
    """
    translations = {}
    total = len(english_notes)
    
    print(f"\nTranslating {total} notes (this may take a while due to rate limits)...")
    print("Progress: ", end="", flush=True)
    
    for i, note in enumerate(english_notes, 1):
        # Show progress every 10 notes
        if i % 10 == 0 or i == total:
            print(f"{i}/{total} ", end="", flush=True)
        
        persian = translate_note(translator, note)
        if persian:
            translations[note] = persian
        
        # Small delay to avoid rate limiting
        if i < total:
            time.sleep(delay_between_notes)
    
    print()  # New line after progress
    return translations


def main():
    """Main translation function."""
    import io
    
    # Set UTF-8 encoding for stdout on Windows
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    
    project_root = Path(__file__).parent.parent
    
    # Paths
    extracted_notes_path = project_root / "data" / "extracted_notes.json"
    output_mapping_path = project_root / "data" / "note_translations.json"
    output_persian_notes_path = project_root / "data" / "translated_notes.txt"
    
    print("=" * 80)
    print("TRANSLATING EXTRACTED NOTES TO PERSIAN")
    print("=" * 80)
    
    # Check translator availability
    if not TRANSLATOR_AVAILABLE:
        print("[ERROR] deep-translator library not available.")
        print(f"Import error: {_import_error}")
        print(f"Python interpreter: {sys.executable}")
        print("\nTo fix:")
        print("  1. Make sure your virtual environment is activated")
        print("  2. Install with: pip install deep-translator")
        print("  3. Or install from requirements: pip install -r backend/requirements.txt")
        sys.exit(1)
    
    # Initialize Google Translator (free, no API key needed)
    print("\nInitializing Google Translator...")
    try:
        translator = GoogleTranslator(source='en', target='fa')  # 'fa' = Persian/Farsi
        print("[OK] Translator ready (using Google Translate)")
    except Exception as e:
        print(f"[ERROR] Failed to initialize translator: {e}")
        sys.exit(1)
    
    # Load extracted English notes
    print(f"\nLoading extracted notes from: {extracted_notes_path}")
    if not extracted_notes_path.exists():
        print(f"[ERROR] File not found: {extracted_notes_path}")
        print("Run scripts/extract_notes.py first!")
        sys.exit(1)
    
    try:
        with open(extracted_notes_path, "r", encoding="utf-8") as f:
            extracted_data = json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to load extracted notes: {e}")
        sys.exit(1)
    
    english_notes = extracted_data.get("notes", [])
    note_frequency = extracted_data.get("note_frequency", {})
    
    print(f"[OK] Loaded {len(english_notes)} unique English notes")
    
    # Load existing Persian notes (to avoid duplicates)
    print("\nLoading existing Persian notes...")
    existing_persian = load_existing_persian_notes()
    print(f"[OK] Found {len(existing_persian)} existing Persian notes")
    
    # Check if translation mapping already exists
    existing_translations = {}
    if output_mapping_path.exists():
        try:
            with open(output_mapping_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
                existing_translations = existing_data.get("translations", {})
            print(f"[OK] Found {len(existing_translations)} existing translations")
        except Exception as e:
            print(f"[WARNING] Could not load existing translations: {e}")
    
    # Filter out already translated notes
    notes_to_translate = [
        note for note in english_notes
        if note not in existing_translations
    ]
    
    if not notes_to_translate:
        print("\n[OK] All notes already translated!")
        translations = existing_translations
    else:
        print(f"\nTranslating {len(notes_to_translate)} new notes...")
        print(f"(Skipping {len(existing_translations)} already translated)")
        print("\nNote: Google Translate has rate limits. This may take 10-20 minutes for 1300+ notes.")
        print("The script will automatically retry on errors and add delays to avoid rate limiting.\n")
        
        # Translate notes one by one
        new_translations = translate_notes(
            translator,
            notes_to_translate,
            delay_between_notes=0.15  # 150ms delay between requests
        )
        
        # Merge with existing
        translations = {**existing_translations, **new_translations}
        print(f"\n[OK] Total translations: {len(translations)}")
        print(f"     New translations: {len(new_translations)}")
        print(f"     Failed: {len(notes_to_translate) - len(new_translations)}")
    
    # Save translation mapping
    print("\n" + "=" * 80)
    print("SAVING RESULTS")
    print("=" * 80)
    
    output_data = {
        "metadata": {
            "source": "extracted_notes.json",
            "total_english_notes": len(english_notes),
            "translated_count": len(translations),
            "translation_coverage": f"{(len(translations) / len(english_notes) * 100):.1f}%"
        },
        "translations": translations,
        "note_frequency": note_frequency,
    }
    
    try:
        with open(output_mapping_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"[OK] Saved translation mapping to: {output_mapping_path}")
    except Exception as e:
        print(f"[ERROR] Failed to save mapping: {e}")
        sys.exit(1)
    
    # Save Persian notes list (sorted, unique)
    persian_notes = sorted(set(translations.values()))
    try:
        with open(output_persian_notes_path, "w", encoding="utf-8") as f:
            for note in persian_notes:
                f.write(f"{note}\n")
        print(f"[OK] Saved Persian notes list to: {output_persian_notes_path}")
        print(f"  Total unique Persian notes: {len(persian_notes)}")
    except Exception as e:
        print(f"[WARNING] Failed to save Persian notes list: {e}")
    
    # Show statistics
    print("\n" + "=" * 80)
    print("TRANSLATION STATISTICS")
    print("=" * 80)
    
    print(f"\nTotal English notes: {len(english_notes)}")
    print(f"Translated: {len(translations)} ({len(translations) / len(english_notes) * 100:.1f}%)")
    print(f"Unique Persian translations: {len(persian_notes)}")
    
    # Show top 20 most common notes and their translations
    print("\nTop 20 most common notes (with translations):")
    sorted_by_freq = sorted(
        note_frequency.items(),
        key=lambda x: x[1],
        reverse=True
    )[:20]
    
    for i, (note, count) in enumerate(sorted_by_freq, 1):
        persian = translations.get(note, "[NOT TRANSLATED]")
        print(f"  {i:2d}. {note:40s} -> {persian:30s} ({count} times)")
    
    print("\n" + "=" * 80)
    print("[OK] TRANSLATION COMPLETE")
    print("=" * 80)
    print(f"\nNext steps:")
    print(f"  1. Review translations: {output_mapping_path}")
    print(f"  2. Review Persian notes: {output_persian_notes_path}")
    print(f"  3. Merge new Persian notes into backend/api/notes_master.py if needed")


if __name__ == "__main__":
    main()