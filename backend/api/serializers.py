from rest_framework import serializers

from .models import Perfume

# New kiosk-questionnaire fields (frontend alignment)
MOOD_CHOICES = ["fresh", "sweet", "warm", "floral", "woody"]
MOMENT_CHOICES = ["daily", "evening", "outdoor", "gift"]
TIME_CHOICES = ["day", "night", "anytime"]
INTENSITY_CHOICES = ["light", "medium", "strong"]
STYLE_CHOICES = ["feminine", "masculine", "unisex", "any"]
NOTE_CHOICES = [
    "citrus",
    "floral",
    "woody",
    "spicy",
    "sweet",
    "green",
    "oriental",
    "musky",
]

# Legacy fields kept for backward compatibility with older clients
LEGACY_CONTEXT_CHOICES = [
    "office",
    "casual_day",
    "date_night",
    "club",
    "special_event",
]
LEGACY_STRENGTH_CHOICES = ["soft", "moderate", "strong", "very_strong"]
LEGACY_GENDER_CHOICES = ["male", "female", "unisex"]


class QuestionnaireSerializer(serializers.Serializer):
    # New shape
    moods = serializers.ListField(
        child=serializers.ChoiceField(choices=MOOD_CHOICES),
        required=False,
        default=list,
    )
    moments = serializers.ListField(
        child=serializers.ChoiceField(choices=MOMENT_CHOICES),
        required=False,
        default=list,
    )
    times = serializers.ListField(
        child=serializers.ChoiceField(choices=TIME_CHOICES),
        required=False,
        default=list,
    )
    intensity = serializers.ListField(
        child=serializers.ChoiceField(choices=INTENSITY_CHOICES),
        required=False,
        default=list,
    )
    styles = serializers.ListField(
        child=serializers.ChoiceField(choices=STYLE_CHOICES),
        required=False,
        default=list,
    )
    noteLikes = serializers.ListField(
        child=serializers.ChoiceField(choices=NOTE_CHOICES),
        required=False,
        default=list,
    )
    noteDislikes = serializers.ListField(
        child=serializers.ChoiceField(choices=NOTE_CHOICES),
        required=False,
        default=list,
    )

    # Legacy fields (optional, ignored by new frontend)
    contexts = serializers.ListField(
        child=serializers.ChoiceField(choices=LEGACY_CONTEXT_CHOICES),
        required=False,
        default=list,
    )
    sweetness = serializers.IntegerField(required=False, min_value=1, max_value=5, default=3)
    freshness = serializers.IntegerField(required=False, min_value=1, max_value=5, default=3)
    strength = serializers.ChoiceField(
        choices=LEGACY_STRENGTH_CHOICES,
        required=False,
        allow_null=True,
    )
    gender = serializers.ChoiceField(
        choices=LEGACY_GENDER_CHOICES,
        required=False,
        allow_null=True,
    )
    avoid_very_sweet = serializers.BooleanField(required=False, default=False)
    avoid_oud = serializers.BooleanField(required=False, default=False)
    limit = serializers.IntegerField(required=False, default=10, min_value=1, max_value=50)


class PerfumeSerializer(serializers.ModelSerializer):
    notes = serializers.SerializerMethodField()

    class Meta:
        model = Perfume
        fields = [
            "id",
            "name_en",
            "name_fa",
            "name",
            "brand",
            "collection",
            "gender",
            "family",
            "season",
            "strength",
            "character",
            "intensity",
            "notes",
            "tags",
            "images",
            "created_at",
            "updated_at",
        ]

    def get_notes(self, obj: Perfume):
        return {
            "top": obj.notes_top or [],
            "middle": obj.notes_middle or [],
            "base": obj.notes_base or [],
        }
