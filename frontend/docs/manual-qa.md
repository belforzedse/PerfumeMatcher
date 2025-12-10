# Questionnaire Auto-Advance Manual QA

## Optional questions should not auto-advance
1. Start the questionnaire and navigate to an optional question that allows multiple selections (e.g. "حالت روحی" if configured as optional).
2. Select answers until the helper text reports that the maximum has been reached.
3. **Expected:**
   - The question remains visible and is not auto-advanced.
   - The helper text updates to indicate that the maximum selections have been made.
   - The "بعدی" button remains enabled for manual navigation.

## Required selections show confirmation before navigation
1. On a required single-choice question, choose an option.
2. **Expected:**
   - A brief confirmation chip appears beneath the helper text.
   - After the confirmation animation finishes, the questionnaire automatically advances to the next question.
