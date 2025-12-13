import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Perfume


class Command(BaseCommand):
    help = (
        "Import perfumes into SQLite.\n"
        "- Supports legacy frontend data.json format: { brands, collections, perfumes:[{id, notes:{top,middle,base}, ...}] }\n"
        "- Supports backend/perfumes.json format: [{id:<string>, name:<fa>, brand:<fa>, top_notes, heart_notes, base_notes, ...}]\n"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=str,
            default="backend/perfumes.json",
            help="Path to JSON file (supports frontend/public/data/data.json or backend/perfumes.json)",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing perfumes before import",
        )

    def handle(self, *args, **options):
        from django.conf import settings
        source_path = options["source"]
        if not Path(source_path).is_absolute():
            # Resolve relative to project root (two levels up from backend/api/management/commands/)
            project_root = Path(settings.BASE_DIR).parent
            source = project_root / source_path
        else:
            source = Path(source_path)
        if not source.exists():
            raise CommandError(f"Source file not found: {source}")

        data = json.loads(source.read_text(encoding="utf-8"))

        # Format A: backend/perfumes.json => list[dict]
        if isinstance(data, list):
            perfumes = data
            brands = {}
            collections = {}
            format_name = "backend/perfumes.json (list)"
        else:
            # Format B: frontend/public/data/data.json => dict
            perfumes = (data or {}).get("perfumes", [])
            brands = {b["id"]: b.get("name", "") for b in (data or {}).get("brands", [])}
            collections = {c["id"]: c.get("name", "") for c in (data or {}).get("collections", [])}
            format_name = "frontend data.json (dict)"

        if options["reset"]:
            Perfume.objects.all().delete()

        created = 0
        updated = 0
        with transaction.atomic():
            for item in perfumes:
                # Detect which format each item is
                if isinstance(item, dict) and "top_notes" in item and "heart_notes" in item and "base_notes" in item:
                    # backend/perfumes.json item
                    top = item.get("top_notes") or []
                    middle = item.get("heart_notes") or []
                    base = item.get("base_notes") or []
                    all_notes = sorted({*top, *middle, *base})

                    # The JSON "id" is a string, but Perfume PK is numeric => DO NOT assign it.
                    obj = Perfume.objects.create(
                        name=item.get("name") or "",
                        name_fa=item.get("name") or "",
                        name_en="",
                        brand=item.get("brand") or "",
                        collection=item.get("collection") or "",
                        gender=item.get("gender") or None,
                        family=item.get("family") or "",
                        seasons=item.get("seasons") or [],
                        occasions=item.get("occasions") or [],
                        main_accords=item.get("main_accords") or [],
                        intensity=item.get("intensity") or "",
                        notes_top=top,
                        notes_middle=middle,
                        notes_base=base,
                        all_notes=all_notes,
                    )
                    created += 1
                    continue

                # frontend data.json item (id should be numeric)
                pid = item.get("id")
                if pid is None:
                    continue

                notes = item.get("notes", {}) or {}
                top = notes.get("top") or []
                middle = notes.get("middle") or []
                base = notes.get("base") or []
                all_notes = sorted({*top, *middle, *base})

                obj, is_created = Perfume.objects.update_or_create(
                    id=pid,
                    defaults={
                        "name_en": item.get("name_en", "") or "",
                        "name_fa": item.get("name_fa", "") or "",
                        "name": item.get("name_fa", "") or item.get("name_en", "") or "",
                        "brand": brands.get(item.get("brand")) or "",
                        "collection": collections.get(item.get("collection")) or "",
                        "gender": item.get("gender") or None,
                        "family": item.get("family") or "",
                        "season": item.get("season") or "",
                        "character": item.get("character") or "",
                        "intensity": item.get("character") or "",
                        "notes_top": top,
                        "notes_middle": middle,
                        "notes_base": base,
                        "all_notes": all_notes,
                        "tags": item.get("tags") or [],
                        "images": item.get("images") or ([] if not item.get("cover") else [item["cover"]["url"]]),
                    },
                )
                if is_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Import complete ({format_name}). created={created}, updated={updated}, total={created+updated}"
            )
        )

