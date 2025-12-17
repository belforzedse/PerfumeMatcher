"""
Management command to check for orphaned media file references in the database.
Finds perfumes with image URLs pointing to files that don't exist on disk.
"""
import os
import re
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import Perfume


class Command(BaseCommand):
    help = "Check for orphaned media file references and optionally clean them up"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Remove orphaned image references from database",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be cleaned without making changes",
        )

    def extract_filename_from_url(self, url: str) -> str:
        """Extract filename from URL (handles both relative and absolute URLs)."""
        # Remove query parameters
        url = url.split("?")[0]
        # Extract filename from path
        if "/uploads/" in url:
            parts = url.split("/uploads/")
            if len(parts) > 1:
                return parts[1].split("?")[0]  # Remove query params if any
        # Fallback: try to get last part of path
        return url.split("/")[-1]

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        clean = options.get("clean", False)

        if clean and not dry_run:
            self.stdout.write(
                self.style.WARNING("⚠️  This will modify the database. Use --dry-run first to preview changes.")
            )
            confirm = input("Continue? (yes/no): ")
            if confirm.lower() != "yes":
                self.stdout.write(self.style.ERROR("Aborted."))
                return

        # Get media root
        media_root = Path(settings.MEDIA_ROOT)
        uploads_dir = media_root / "uploads"

        if not uploads_dir.exists():
            self.stdout.write(
                self.style.ERROR(f"Uploads directory does not exist: {uploads_dir}")
            )
            return

        # Get all files that exist on disk
        existing_files = {f.name for f in uploads_dir.iterdir() if f.is_file()}
        self.stdout.write(
            self.style.SUCCESS(f"Found {len(existing_files)} files on disk")
        )

        # Find all perfumes with images
        perfumes = Perfume.objects.exclude(images__isnull=True).exclude(images=[])
        total_perfumes = perfumes.count()
        self.stdout.write(f"Checking {total_perfumes} perfumes with images...")

        orphaned_count = 0
        fixed_count = 0
        issues = []

        for perfume in perfumes:
            if not perfume.images or not isinstance(perfume.images, list):
                continue

            original_images = perfume.images.copy()
            valid_images = []
            has_orphaned = False

            for img_url in original_images:
                if not img_url or not isinstance(img_url, str):
                    continue

                filename = self.extract_filename_from_url(img_url)

                if filename in existing_files:
                    valid_images.append(img_url)
                else:
                    has_orphaned = True
                    issues.append({
                        "perfume_id": perfume.id,
                        "perfume_name": str(perfume),
                        "missing_file": filename,
                        "url": img_url,
                    })

            if has_orphaned:
                orphaned_count += 1
                if clean and not dry_run:
                    perfume.images = valid_images
                    perfume.save()
                    fixed_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Fixed perfume {perfume.id} ({perfume.name_fa or perfume.name_en}): "
                            f"removed {len(original_images) - len(valid_images)} orphaned reference(s)"
                        )
                    )

        # Report results
        self.stdout.write("\n" + "=" * 60)
        if issues:
            self.stdout.write(
                self.style.WARNING(f"\n⚠️  Found {len(issues)} orphaned image references in {orphaned_count} perfumes:")
            )
            for issue in issues[:10]:  # Show first 10
                self.stdout.write(
                    f"  - Perfume #{issue['perfume_id']} ({issue['perfume_name']}): "
                    f"missing file '{issue['missing_file']}'"
                )
            if len(issues) > 10:
                self.stdout.write(f"  ... and {len(issues) - 10} more")
        else:
            self.stdout.write(self.style.SUCCESS("\n✓ No orphaned image references found!"))

        if dry_run and issues:
            self.stdout.write(
                self.style.WARNING(
                    f"\n💡 Run with --clean (without --dry-run) to remove these orphaned references"
                )
            )
        elif clean and not dry_run:
            self.stdout.write(
                self.style.SUCCESS(f"\n✓ Fixed {fixed_count} perfumes with orphaned image references")
            )

        self.stdout.write("=" * 60)

