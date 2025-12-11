from rest_framework import serializers

from .models import Perfume
from .notes_master import is_valid_note, validate_notes

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
    """
    Questionnaire for perfume matching.

    CANONICAL FIELDS (used by current frontend):
    - moods: ["fresh", "sweet", "warm", "floral", "woody"]
    - moments: ["daily", "evening", "outdoor", "gift"]
    - times: ["day", "night", "anytime"]
    - intensity: ["light", "medium", "strong"]
    - styles: ["feminine", "masculine", "unisex", "any"]
    - noteLikes/noteDislikes: [note categories - 17 total]

    LEGACY FIELDS (backward compatibility):
    - contexts → moments (partial semantic mapping)
    - sweetness/freshness → moods (1-5 scale)
    - strength → intensity
    - gender → styles
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
        
        valid_notes, invalid_notes = validate_notes(notes)
        
        if invalid_notes:
            raise serializers.ValidationError(
                f"Invalid notes (not in predefined list): {', '.join(invalid_notes)}"
            )
        
        return valid_notes
    
    def validate_notes_top(self, value):
        return self.validate_notes_field(value) if value else []
    
    def validate_notes_middle(self, value):
        return self.validate_notes_field(value) if value else []
    
    def validate_notes_base(self, value):
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
