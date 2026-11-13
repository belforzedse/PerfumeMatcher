from unittest.mock import patch

from django.test import TestCase, override_settings

from .models import Perfume
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

@override_settings(OPENAI_API_KEY="")
class SampleCatalogTests(TestCase):
    fixtures = ["sample_catalog"]

    def test_english_kiosk_can_rank_the_sample_catalog_without_an_api_key(self):
        with patch("matcher.vectorizer._engine_instance", None):
            response = self.client.post(
                "/api/recommend/rerank/?lang=en",
                {"moments": ["evening"], "intensity": ["strong"], "noteLikes": ["spicy"]},
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["fallback"])
        self.assertTrue(body["rankings"])
        catalog_ids = set(Perfume.objects.values_list("pk", flat=True))
        ranking_ids = [item["id"] for item in body["rankings"]]
        self.assertEqual(len(ranking_ids), len(set(ranking_ids)))
        self.assertTrue(set(ranking_ids) <= catalog_ids)
        self.assertTrue(all(0 <= item["matchPercentage"] <= 100 for item in body["rankings"]))
