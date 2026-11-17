
import json
import time
from pathlib import Path

from .gandom_catalog import load_gandom_perfumes
from .scento_client import ScentoClient


INDEX_FILE = (
    Path(__file__).resolve().parent.parent
    / ".cache"
    / "scento_index.json"
)


def build_index(limit=10):
    perfumes = load_gandom_perfumes()
    client = ScentoClient()

    INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)

    if INDEX_FILE.exists():
        try:
            index = json.loads(
                INDEX_FILE.read_text(encoding="utf-8")
            )
        except (OSError, ValueError):
            index = {}
    else:
        index = {}

    try:
        for perfume in perfumes[:limit]:
            pid = str(perfume.id)

            if pid in index:
                print(f"SKIP: {perfume.name}")
                continue

            print(f"Checking: {perfume.name}", flush=True)

            try:
                profile = client.get_profile(
                    perfume.name,
                )

                if not profile or not profile.get("perfume"):
                    print("NOT FOUND")
                    continue

                detail = profile["perfume"].get("detail", {})

                neighbours = (
                    (profile.get("neighbours") or {})
                    .get("detail", {})
                    .get("neighbours", [])
                )

                index[pid] = {
                    "name": perfume.name,
                    "slug": profile["slug"],
                    "family": detail.get("family"),
                    "subfamily": detail.get("subfamily"),
                    "pyramid": detail.get("pyramid", {}),
                    "character_words": detail.get(
                        "character_words", []
                    ),
                    "wears": detail.get("wears", {}),
                    "neighbours": neighbours,
                }

                INDEX_FILE.write_text(
                    json.dumps(
                        index,
                        ensure_ascii=False,
                        indent=2,
                    ),
                    encoding="utf-8",
                )

                print(f"OK: {profile['slug']}")

            except Exception as exc:
                print(f"ERROR: {exc}")

            time.sleep(0.5)

    finally:
        client.close()

    print(f"Indexed products: {len(index)}")
    print(f"Saved to: {INDEX_FILE}")


if __name__ == "__main__":
    build_index()
