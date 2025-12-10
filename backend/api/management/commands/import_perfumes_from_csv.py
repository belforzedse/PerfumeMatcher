from django.core.management.base import BaseCommand, CommandError

from scripts import csv_to_perfumes


class Command(BaseCommand):
    help = "Import perfumes from the Persian CSV into backend/perfumes.json"

    def handle(self, *args, **options):
        try:
            csv_to_perfumes.main()
        except FileNotFoundError as exc:
            raise CommandError(str(exc)) from exc
        except Exception as exc:  # pragma: no cover - catch-all for CLI clarity
            raise CommandError(f"Failed to import perfumes: {exc}") from exc
        else:
            self.stdout.write(self.style.SUCCESS("perfumes.json regenerated"))

