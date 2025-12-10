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

    name = models.CharField(max_length=200)
    brand = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    gender = models.CharField(
        max_length=12, choices=Gender.choices, blank=True, null=True
    )
    season = models.CharField(max_length=50, blank=True)  # e.g., spring/summer/fall
    strength = models.CharField(
        max_length=20, choices=Strength.choices, blank=True, null=True
    )
    notes = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    images = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.brand} - {self.name}"
