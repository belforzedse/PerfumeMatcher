from django.db import models
from django.utils.translation import gettext_lazy as _


class Perfume(models.Model):
    """Perfume entity stored for admin CRUD and matcher catalog management."""

    class Gender(models.TextChoices):
        MALE = "male", _("Male")
        FEMALE = "female", _("Female")
        UNISEX = "unisex", _("Unisex")

    class Strength(models.TextChoices):
        SOFT = "soft", _("Soft")
        MODERATE = "moderate", _("Moderate")
        STRONG = "strong", _("Strong")
        VERY_STRONG = "very_strong", _("Very Strong")

    # Basic identifiers
    name_en = models.CharField(max_length=200, blank=True, default="")
    name_fa = models.CharField(max_length=200, blank=True, default="")
    name = models.CharField(max_length=200, blank=True, default="")  # legacy fallback
    brand = models.CharField(max_length=200, blank=True, default="")
    collection = models.CharField(max_length=200, blank=True, default="")

    # Attributes
    description = models.TextField(blank=True)
    gender = models.CharField(
        max_length=12, choices=Gender.choices, blank=True, null=True
    )
    family = models.CharField(max_length=120, blank=True, default="")
    season = models.CharField(max_length=50, blank=True, default="")
    strength = models.CharField(
        max_length=20, choices=Strength.choices, blank=True, null=True
    )
    character = models.CharField(max_length=120, blank=True, default="")
    intensity = models.CharField(max_length=50, blank=True, default="")

    # Notes
    notes_top = models.JSONField(default=list, blank=True)
    notes_middle = models.JSONField(default=list, blank=True)
    notes_base = models.JSONField(default=list, blank=True)
    all_notes = models.JSONField(default=list, blank=True)

    # Media/tags
    tags = models.JSONField(default=list, blank=True)
    images = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        display = self.name_fa or self.name_en or self.name or "Perfume"
        return f"{self.brand} - {display}" if self.brand else display
