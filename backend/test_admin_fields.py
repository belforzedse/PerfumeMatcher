"""
Test to verify admin panel can properly save main_accords and occasions.
Run: python test_admin_fields.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'matcher_backend.settings')
django.setup()

from api.models import Perfume

def test_admin_field_persistence():
    """Test that main_accords and occasions can be saved and retrieved."""
    print("=" * 60)
    print("TESTING ADMIN FIELD PERSISTENCE")
    print("=" * 60)

    # Create a test perfume
    print("\n1. Creating test perfume with main_accords and occasions...")
    test_perfume = Perfume.objects.create(
        name_en="Test Perfume",
        brand="Test Brand",
        main_accords=["sweet", "woody", "spicy"],
        occasions=["date", "evening", "formal"]
    )
    print(f"   Created perfume ID: {test_perfume.id}")
    print(f"   main_accords: {test_perfume.main_accords}")
    print(f"   occasions: {test_perfume.occasions}")

    # Retrieve from database
    print("\n2. Retrieving perfume from database...")
    retrieved = Perfume.objects.get(id=test_perfume.id)
    print(f"   Retrieved main_accords: {retrieved.main_accords}")
    print(f"   Retrieved occasions: {retrieved.occasions}")

    # Verify types
    print("\n3. Verifying data types...")
    assert isinstance(retrieved.main_accords, list), f"main_accords should be list, got {type(retrieved.main_accords)}"
    assert isinstance(retrieved.occasions, list), f"occasions should be list, got {type(retrieved.occasions)}"
    print("   [PASS] Both fields are lists")

    # Verify values
    print("\n4. Verifying values...")
    assert retrieved.main_accords == ["sweet", "woody", "spicy"], f"main_accords mismatch"
    assert retrieved.occasions == ["date", "evening", "formal"], f"occasions mismatch"
    print("   [PASS] Values match expected")

    # Test empty arrays
    print("\n5. Testing empty arrays (default behavior)...")
    empty_perfume = Perfume.objects.create(
        name_en="Empty Perfume",
        brand="Test Brand"
    )
    print(f"   main_accords (default): {empty_perfume.main_accords}")
    print(f"   occasions (default): {empty_perfume.occasions}")
    assert empty_perfume.main_accords == [], "Default should be empty list"
    assert empty_perfume.occasions == [], "Default should be empty list"
    print("   [PASS] Defaults are empty lists")

    # Test update
    print("\n6. Testing update...")
    retrieved.main_accords.append("oriental")
    retrieved.occasions.append("night_out")
    retrieved.save()

    updated = Perfume.objects.get(id=retrieved.id)
    print(f"   Updated main_accords: {updated.main_accords}")
    print(f"   Updated occasions: {updated.occasions}")
    assert "oriental" in updated.main_accords, "Update failed for main_accords"
    assert "night_out" in updated.occasions, "Update failed for occasions"
    print("   [PASS] Updates persist correctly")

    # Cleanup
    print("\n7. Cleaning up test data...")
    test_perfume.delete()
    empty_perfume.delete()
    print("   [PASS] Test data cleaned up")

    print("\n" + "=" * 60)
    print("ALL ADMIN FIELD TESTS PASSED")
    print("=" * 60)
    print("\n[INFO] Admin panel SHOULD work correctly, but has limitations:")
    print("  - JSONField shows as plain textarea in Django admin")
    print("  - Users must manually type: [\"value1\", \"value2\"]")
    print("  - No dropdown/autocomplete for valid values")
    print("  - Syntax errors possible (missing quotes, brackets)")
    print("\n[RECOMMENDATION] Consider adding a custom admin form with:")
    print("  - Checkboxes or multi-select for occasions")
    print("  - Checkboxes or multi-select for main_accords")
    print("  - This would be more user-friendly than raw JSON editing")
    return True

if __name__ == "__main__":
    try:
        test_admin_field_persistence()
        sys.exit(0)
    except Exception as e:
        print(f"\n[FAIL] Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
