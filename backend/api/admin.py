from django.contrib import admin
from django import forms

from .models import Perfume


class PerfumeAdminForm(forms.ModelForm):
    """Custom admin form with better widgets for JSON fields."""

    # Define choices for main_accords (common perfume accord types)
    ACCORD_CHOICES = [
        ('fresh', 'Fresh/Citrus'),
        ('floral', 'Floral'),
        ('woody', 'Woody'),
        ('spicy', 'Spicy'),
        ('sweet', 'Sweet'),
        ('gourmand', 'Gourmand'),
        ('oriental', 'Oriental'),
        ('aquatic', 'Aquatic'),
        ('green', 'Green'),
        ('fruity', 'Fruity'),
        ('powdery', 'Powdery'),
        ('leather', 'Leather'),
        ('tobacco', 'Tobacco'),
    ]

    # Define choices for occasions
    OCCASION_CHOICES = [
        ('everyday', 'Everyday/Casual'),
        ('office', 'Office/Work'),
        ('date', 'Date/Romantic'),
        ('evening', 'Evening Out'),
        ('night_out', 'Night Out/Party'),
        ('formal', 'Formal Event'),
        ('sport', 'Sport/Outdoor'),
        ('daytime', 'Daytime'),
        ('night', 'Night'),
    ]

    # Override main_accords with MultipleChoiceField
    main_accords_display = forms.MultipleChoiceField(
        choices=ACCORD_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        required=False,
        label="Main Accords (Select all that apply)",
        help_text="Select the dominant scent characteristics"
    )

    # Override occasions with MultipleChoiceField
    occasions_display = forms.MultipleChoiceField(
        choices=OCCASION_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        required=False,
        label="Occasions (Select all that apply)",
        help_text="When is this perfume most suitable?"
    )

    class Meta:
        model = Perfume
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Pre-populate checkbox fields from JSON data
        if self.instance and self.instance.pk:
            if self.instance.main_accords:
                self.fields['main_accords_display'].initial = self.instance.main_accords
            if self.instance.occasions:
                self.fields['occasions_display'].initial = self.instance.occasions

    def save(self, commit=True):
        instance = super().save(commit=False)

        # Save checkbox selections back to JSON fields
        if 'main_accords_display' in self.cleaned_data:
            instance.main_accords = list(self.cleaned_data['main_accords_display'])
        if 'occasions_display' in self.cleaned_data:
            instance.occasions = list(self.cleaned_data['occasions_display'])

        if commit:
            instance.save()
        return instance


@admin.register(Perfume)
class PerfumeAdmin(admin.ModelAdmin):
    form = PerfumeAdminForm

    list_display = ("name", "brand", "gender", "season", "strength", "created_at", "get_accords", "get_occasions")
    search_fields = ("name", "brand", "notes", "tags")
    list_filter = ("gender", "season", "strength")

    fieldsets = (
        ('Basic Information', {
            'fields': ('name_en', 'name_fa', 'name', 'brand', 'collection', 'description')
        }),
        ('Classification', {
            'fields': ('gender', 'family', 'season', 'seasons', 'strength', 'intensity', 'character')
        }),
        ('Matching Attributes', {
            'fields': ('main_accords_display', 'occasions_display'),
            'description': 'These fields improve matching quality. Select applicable options.'
        }),
        ('Notes', {
            'fields': ('notes_top', 'notes_middle', 'notes_base', 'all_notes'),
            'classes': ('collapse',),
        }),
        ('Metadata', {
            'fields': ('tags', 'images'),
            'classes': ('collapse',),
        }),
    )

    def get_accords(self, obj):
        """Display main_accords in list view."""
        if obj.main_accords:
            return ", ".join(obj.main_accords[:3])  # Show first 3
        return "-"
    get_accords.short_description = "Main Accords"

    def get_occasions(self, obj):
        """Display occasions in list view."""
        if obj.occasions:
            return ", ".join(obj.occasions[:3])  # Show first 3
        return "-"
    get_occasions.short_description = "Occasions"
