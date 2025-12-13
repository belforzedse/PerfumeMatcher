# Frontend Admin Panel vs Backend Data Model Comparison

## ✅ Fully Supported Fields

The frontend admin panel currently supports these backend fields:

1. **Basic Information**
   - `name_fa` ✅
   - `name_en` ✅
   - `brand` ✅ (as string)
   - `collection` ✅ (as string)
   - `images` ✅ (first image only, as `cover`)

2. **Classification**
   - `gender` ✅ (with Persian ↔ English translation)
   - `family` ✅ (with Persian ↔ English translation)
   - `season` ✅ (with Persian ↔ English translation, but only single value)
   - `character` ✅ (with Persian ↔ English translation)

3. **Notes**
   - `notes_top` ✅ (as JSON array)
   - `notes_middle` ✅ (as JSON array)
   - `notes_base` ✅ (as JSON array)

## ❌ Missing/Not Supported Fields

The backend has these fields that the frontend admin panel does NOT support:

1. **Basic Information**
   - `description` ❌ (TextField) - Description field not shown/editable

2. **Classification**
   - `seasons` ❌ (JSONField) - Backend supports multiple seasons, frontend only uses single `season`
   - `strength` ❌ (ChoiceField: soft/moderate/strong/very_strong) - Not in form
   - `intensity` ❌ (CharField) - Not in form

3. **Matching Attributes**
   - `occasions` ❌ (JSONField) - Used for matching, not editable
   - `main_accords` ❌ (JSONField) - Used for matching, not editable

4. **Metadata**
   - `tags` ❌ (JSONField) - Not shown/editable
   - `all_notes` ❌ (JSONField) - Auto-generated, but not viewable
   - `created_at` ❌ - Not shown
   - `updated_at` ❌ - Not shown

5. **Multiple Images**
   - `images` ⚠️ - Only first image is shown/editable, backend supports array

## Summary

**Supported:** 10 fields (basic info, classification, notes)
**Missing:** 9+ fields (description, seasons array, strength, intensity, occasions, main_accords, tags, timestamps, multiple images)

## Recommendations

1. **High Priority:**
   - Add `description` field (text area)
   - Add `strength` dropdown (soft/moderate/strong/very_strong)
   - Support multiple seasons via `seasons` JSONField instead of single `season`

2. **Medium Priority:**
   - Add `intensity` field
   - Show `tags` field for editing
   - Support multiple images (currently only first image)

3. **Low Priority:**
   - Show `occasions` and `main_accords` for viewing (used by matcher)
   - Display `created_at` and `updated_at` timestamps (read-only)
   - Show `all_notes` computed field (read-only)







