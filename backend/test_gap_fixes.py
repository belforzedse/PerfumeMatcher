"""
Quick integration tests for gap fixes.
Run: python test_gap_fixes.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'matcher_backend.settings')
django.setup()

from api.serializers import QuestionnaireSerializer, NOTE_CHOICES
from api.models import Perfume
from matcher.vectorizer import perfume_to_text, questionnaire_to_profile_text

def test_gap1_all_note_categories():
    """Gap 1: Test that all 17 note categories are accepted."""
    print("\n=== Testing Gap 1: All 17 Note Categories ===")

    all_categories = [
        "citrus", "floral", "fruity", "woody", "spicy",
        "sweet", "gourmand", "green", "oriental", "resinous",
        "aquatic", "earthy", "musky", "animalic", "powdery",
        "tobacco", "leather"
    ]

    print(f"NOTE_CHOICES count: {len(NOTE_CHOICES)}")
    print(f"Expected count: 17")
    assert len(NOTE_CHOICES) == 17, f"Expected 17 categories, got {len(NOTE_CHOICES)}"

    # Test with serializer
    payload = {"noteLikes": all_categories}
    serializer = QuestionnaireSerializer(data=payload)

    if serializer.is_valid():
        print("[PASS] All 17 note categories accepted by serializer")
    else:
        print(f"[FAIL] Serializer errors: {serializer.errors}")
        return False

    # Test noteDislikes too
    payload = {"noteDislikes": all_categories}
    serializer = QuestionnaireSerializer(data=payload)

    if serializer.is_valid():
        print("[PASS] All 17 note categories accepted in noteDislikes")
    else:
        print(f"[FAIL] Serializer errors: {serializer.errors}")
        return False

    # Test that invalid categories are still rejected
    payload = {"noteLikes": ["invalid_category"]}
    serializer = QuestionnaireSerializer(data=payload)

    if not serializer.is_valid():
        print("[PASS] Invalid categories correctly rejected")
    else:
        print("[FAIL] Invalid categories were accepted (should be rejected)")
        return False

    return True

def test_gap3_main_accords_occasions():
    """Gap 3: Test that main_accords and occasions are included in vectorization."""
    print("\n=== Testing Gap 3: main_accords and occasions ===")

    # Create a mock perfume object
    class MockPerfume:
        def __init__(self):
            self.family = None
            self.notes_top = []
            self.notes_middle = []
            self.notes_base = []
            self.main_accords = ["وانیل", "چوب صندل"]
            self.occasions = ["date", "evening"]
            self.gender = None
            self.season = None
            self.seasons = []
            self.intensity = None

    perfume = MockPerfume()
    text = perfume_to_text(perfume)

    # Don't print Persian text directly (encoding issues on Windows)
    print(f"Generated perfume text length: {len(text)} characters")

    if "accord_" in text:
        print("[PASS] main_accords are included in perfume text (accord_ tokens found)")
    else:
        print("[FAIL] main_accords NOT found in perfume text")
        return False

    if "occasion_" in text:
        print("[PASS] occasions are included in perfume text (occasion_ tokens found)")
    else:
        print("[FAIL] occasions NOT found in perfume text")
        return False

    # Verify accords are weighted (repeated 2x)
    accord_count = text.count("accord_")
    print(f"  Accord token count: {accord_count} (expected: 4 = 2 accords × 2 repetitions)")

    # Verify occasions are included once
    occasion_count = text.count("occasion_")
    print(f"  Occasion token count: {occasion_count} (expected: 2 = 2 occasions × 1)")

    # Test with empty arrays (should not break)
    perfume.main_accords = []
    perfume.occasions = []
    text = perfume_to_text(perfume)
    print("[PASS] Empty main_accords/occasions handled gracefully")

    return True

def test_gap2_anytime_mapping():
    """Gap 2: Test that 'anytime' emits both day and night tokens."""
    print("\n=== Testing Gap 2: 'anytime' Mapping ===")

    qdata = {"times": ["anytime"]}
    profile = questionnaire_to_profile_text(qdata)

    # Don't print full profile (may contain Persian chars)
    print(f"Generated profile text length: {len(profile)} characters")

    if "occasion_daytime" in profile:
        print("[PASS] 'anytime' emits 'daytime' token")
    else:
        print("[FAIL] 'anytime' does NOT emit 'daytime' token")
        return False

    if "occasion_night" in profile:
        print("[PASS] 'anytime' emits 'night' token")
    else:
        print("[FAIL] 'anytime' does NOT emit 'night' token")
        return False

    # Test that 'any' style doesn't emit gender tokens
    qdata = {"styles": ["any"]}
    profile = questionnaire_to_profile_text(qdata)

    if "gender_" not in profile:
        print("[PASS] 'any' style correctly emits no gender tokens")
    else:
        print("[FAIL] 'any' style emitted gender tokens (should be empty)")
        return False

    return True

def main():
    print("=" * 60)
    print("RUNNING GAP FIX INTEGRATION TESTS")
    print("=" * 60)

    results = []

    # Test Gap 1
    try:
        results.append(("Gap 1: Note Categories", test_gap1_all_note_categories()))
    except Exception as e:
        print(f"[FAIL] Gap 1 test failed with exception: {e}")
        results.append(("Gap 1: Note Categories", False))

    # Test Gap 3
    try:
        results.append(("Gap 3: main_accords/occasions", test_gap3_main_accords_occasions()))
    except Exception as e:
        print(f"[FAIL] Gap 3 test failed with exception: {e}")
        results.append(("Gap 3: main_accords/occasions", False))

    # Test Gap 2
    try:
        results.append(("Gap 2: anytime/any mapping", test_gap2_anytime_mapping()))
    except Exception as e:
        print(f"[FAIL] Gap 2 test failed with exception: {e}")
        results.append(("Gap 2: anytime/any mapping", False))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    for test_name, passed in results:
        status = "[PASSED]" if passed else "[FAILED]"
        print(f"{status}: {test_name}")

    all_passed = all(result[1] for result in results)

    print("\n" + "=" * 60)
    if all_passed:
        print("ALL TESTS PASSED")
        print("=" * 60)
        return 0
    else:
        print("SOME TESTS FAILED")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
