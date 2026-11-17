from rest_framework import serializers

from .models import Brand, Collection, Perfume
from .notes_master import is_valid_note, validate_notes


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ["id", "name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class CollectionSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)

    class Meta:
        model = Collection
        fields = ["id", "name", "brand", "brand_name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

# New kiosk-questionnaire fields (frontend alignment)
MOOD_CHOICES = ["fresh", "sweet", "warm", "floral", "woody"]
MOMENT_CHOICES = ["daily", "evening", "outdoor", "gift"]
TIME_CHOICES = ["day", "night", "anytime"]
INTENSITY_CHOICES = ["light", "medium", "strong"]
STYLE_CHOICES = ["feminine", "masculine", "unisex", "any"]
NOTE_CHOICES = [
    "citrus",
    "floral",
    "fruity",
    "woody",
    "spicy",
    "sweet",
    "gourmand",
    "green",
    "oriental",
    "resinous",
    "aquatic",
    "earthy",
    "musky",
    "animalic",
    "powdery",
    "tobacco",
    "leather",
    "vanilla",
    "white-floral",
    "soapy",
]
SPECIFIC_DISLIKED_NOTES = [
    "وانیل",
    "عود",
    "چرم",
    "نعناع هندی",
    "پاتچولی",
    "پچولی",
    "یاس",
    "یاسمن",
    "مریم",
    "گاردنیا",
    "بهار نارنج",
    "بهارنارنج",
    "ترنج",
    "گریپ فروت",
    "لیمو",
    "مشک",
]

NOTE_CHOICES = list(
    dict.fromkeys(NOTE_CHOICES + SPECIFIC_DISLIKED_NOTES)
)

SCENT_TRAIT_IDS = (
    "sweetness",
    "freshness",
    "warmth",
    "bitterness",
    "powdery",
    "woody",
)
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
    """
    Questionnaire for perfume matching.

    CANONICAL FIELDS (used by current frontend):
    - moods: ["fresh", "sweet", "warm", "floral", "woody"]
    - moments: ["daily", "evening", "outdoor", "gift"]
    - times: ["day", "night", "anytime"]
    - intensity: ["light", "medium", "strong"]
    - styles: ["feminine", "masculine", "unisex", "any"]
    - gender: ["male", "female", "unisex"] (hard filter)
    - noteLikes/noteDislikes: [note categories - 17 total]

    LEGACY FIELDS (backward compatibility):
    - contexts → moments (partial semantic mapping)
    - sweetness/freshness → moods (1-5 scale)
    - strength → intensity
    - gender (supported; hard filter)
    - avoid_very_sweet/avoid_oud → special penalties

    CONFLICT HANDLING:
    If both legacy and new fields sent, both are processed (additive).
    Recommend clients use ONLY new OR legacy, not mixed.
    """
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
    scentTraits = serializers.DictField(
        child=serializers.IntegerField(
            min_value=1,
            max_value=5,
        ),
        required=False,
        default=dict,
    )
    maxBudgetToman = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
        max_value=1_000_000_000,
        default=None,
    )

    def validate_scentTraits(self, values):
        unexpected = set(values) - set(SCENT_TRAIT_IDS)

        if unexpected:
            raise serializers.ValidationError(
                f"Unsupported scent traits: "
                f"{', '.join(sorted(unexpected))}"
            )

        return values


    def validate_favoritePerfumes(self, value):
        allowed_reasons = {
            "overall",
            "sweetness",
            "freshness",
            "warmth",
            "woody",
            "projection",
            "longevity",
        }

        cleaned = []
        seen_ids = set()

        for item in value:
            perfume_id = str(item.get("id", "")).strip()
            name = str(item.get("name", "")).strip()
            reasons = item.get("likedFeatures", [])

            if (
                not perfume_id.isdigit()
                or not name
                or not isinstance(reasons, list)
                or any(
                    not isinstance(reason, str)
                    or reason not in allowed_reasons
                    for reason in reasons
                )
            ):
                raise serializers.ValidationError(
                    "Invalid favorite perfume data."
                )

            if perfume_id in seen_ids:
                continue

            seen_ids.add(perfume_id)
            cleaned.append({
                "id": perfume_id,
                "name": name[:200],
                "likedFeatures": list(dict.fromkeys(reasons)),
            })

        return cleaned

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
    notes_top = serializers.JSONField(required=False, allow_null=True)
    notes_middle = serializers.JSONField(required=False, allow_null=True)
    notes_base = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = Perfume
        fields = [
            "id",
            "name_en",
            "name_fa",
            "name",
            "brand",
            "collection",
            "description",
            "gender",
            "family",
            "season",
            "seasons",
            "strength",
            "character",
            "intensity",
            "notes",
            "notes_top",
            "notes_middle",
            "notes_base",
            "tags",
            "images",
            "occasions",
            "main_accords",
            "all_notes",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "notes_top": {"write_only": True},
            "notes_middle": {"write_only": True},
            "notes_base": {"write_only": True},
        }

    def get_notes(self, obj: Perfume):
        return {
            "top": obj.notes_top or [],
            "middle": obj.notes_middle or [],
            "base": obj.notes_base or [],
        }

    def validate_notes_field(self, notes: list) -> list:
        """Validate notes against predefined list."""
        if not isinstance(notes, list):
            raise serializers.ValidationError("Notes must be a list")

        if not notes:
            return []

        valid_notes, invalid_notes = validate_notes(notes)

        # Log invalid notes but don't fail - just return valid ones
        # This allows Persian notes that aren't in the predefined list
        if invalid_notes:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Some notes not in predefined list (will be skipped): {', '.join(invalid_notes)}")

        return valid_notes

    def validate_notes_top(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            return []
        return self.validate_notes_field(value) if value else []

    def validate_notes_middle(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            return []
        return self.validate_notes_field(value) if value else []

    def validate_notes_base(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            return []
        return self.validate_notes_field(value) if value else []

    def create(self, validated_data):
        # Extract notes fields if provided
        notes_top = validated_data.pop("notes_top", [])
        notes_middle = validated_data.pop("notes_middle", [])
        notes_base = validated_data.pop("notes_base", [])

        perfume = Perfume.objects.create(**validated_data)
        perfume.notes_top = notes_top
        perfume.notes_middle = notes_middle
        perfume.notes_base = notes_base
        perfume.save()
        return perfume

    def update(self, instance, validated_data):
        # Extract notes fields if provided
        notes_top = validated_data.pop("notes_top", None)
        notes_middle = validated_data.pop("notes_middle", None)
        notes_base = validated_data.pop("notes_base", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if notes_top is not None:
            instance.notes_top = notes_top
        if notes_middle is not None:
            instance.notes_middle = notes_middle
        if notes_base is not None:
            instance.notes_base = notes_base

        instance.save()
        return instance
