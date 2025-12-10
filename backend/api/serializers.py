from rest_framework import serializers

from .models import Perfume


MOOD_CHOICES = [
    "fresh",
    "cozy",
    "sexy",
    "elegant",
    "playful",
    "mysterious",
    "sporty",
    "formal",
]

CONTEXT_CHOICES = [
    "office",
    "casual_day",
    "date_night",
    "club",
    "special_event",
]

STRENGTH_CHOICES = ["soft", "moderate", "strong", "very_strong"]

GENDER_CHOICES = ["male", "female", "unisex"]


class QuestionnaireSerializer(serializers.Serializer):
    moods = serializers.ListField(
        child=serializers.ChoiceField(choices=MOOD_CHOICES),
        required=False,
        default=list,
    )
    contexts = serializers.ListField(
        child=serializers.ChoiceField(choices=CONTEXT_CHOICES),
        required=False,
        default=list,
    )
    sweetness = serializers.IntegerField(required=False, min_value=1, max_value=5, default=3)
    freshness = serializers.IntegerField(required=False, min_value=1, max_value=5, default=3)
    strength = serializers.ChoiceField(
        choices=STRENGTH_CHOICES,
        required=False,
        allow_null=True,
    )
    gender = serializers.ChoiceField(
        choices=GENDER_CHOICES,
        required=False,
        allow_null=True,
    )
    avoid_very_sweet = serializers.BooleanField(required=False, default=False)
    avoid_oud = serializers.BooleanField(required=False, default=False)
    limit = serializers.IntegerField(required=False, default=10, min_value=1, max_value=50)


class PerfumeSerializer(serializers.ModelSerializer):
    notes = serializers.ListField(
        child=serializers.CharField(max_length=120),
        required=False,
        allow_empty=True,
        default=list,
    )
    tags = serializers.ListField(
        child=serializers.CharField(max_length=80),
        required=False,
        allow_empty=True,
        default=list,
    )
    images = serializers.ListField(
        child=serializers.URLField(max_length=500),
        required=False,
        allow_empty=True,
        default=list,
    )

    class Meta:
        model = Perfume
        fields = [
            "id",
            "name",
            "brand",
            "description",
            "gender",
            "season",
            "strength",
            "notes",
            "tags",
            "images",
            "created_at",
            "updated_at",
        ]
