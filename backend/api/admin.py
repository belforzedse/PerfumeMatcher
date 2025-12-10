from django.contrib import admin

from .models import Perfume


@admin.register(Perfume)
class PerfumeAdmin(admin.ModelAdmin):
    list_display = ("name", "brand", "gender", "season", "strength", "created_at")
    search_fields = ("name", "brand", "notes", "tags")
    list_filter = ("gender", "season", "strength")
