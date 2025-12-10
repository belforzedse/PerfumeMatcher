from django.test import TestCase

from .serializers import QuestionnaireSerializer


class QuestionnaireSerializerTests(TestCase):
    def test_accepts_new_questionnaire_shape(self):
        payload = {
            "moods": ["fresh", "sweet"],
            "moments": ["daily", "evening"],
            "times": ["day"],
            "intensity": ["medium"],
            "styles": ["unisex"],
            "noteLikes": ["citrus", "woody"],
            "noteDislikes": ["sweet"],
            "limit": 5,
        }
        serializer = QuestionnaireSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        validated = serializer.validated_data
        self.assertEqual(validated["moods"], ["fresh", "sweet"])
        self.assertEqual(validated["noteDislikes"], ["sweet"])
        self.assertEqual(validated["limit"], 5)

    def test_rejects_invalid_choices(self):
        payload = {"moods": ["invalid-mood"], "moments": [], "times": []}
        serializer = QuestionnaireSerializer(data=payload)
        self.assertFalse(serializer.is_valid())
        self.assertIn("moods", serializer.errors)
