
import hashlib
import json
import re
import time
from difflib import SequenceMatcher
from pathlib import Path
from urllib.parse import urlparse

import httpx


class ScentoClient:
    BASE_URL = "https://www.scento.com/api/perfume/v1"
    CACHE_TTL = 60 * 60 * 24

    CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"
    CACHE_FILE = CACHE_DIR / "scento_cache.json"

    def __init__(self):
        self.client = httpx.Client(
            timeout=20,
            follow_redirects=True,
            headers={"User-Agent": "GandomPerfumeKiosk/1.0"},
        )
        self.cache = self._load_cache()

    def _load_cache(self):
        try:
            if self.CACHE_FILE.exists():
                return json.loads(
                    self.CACHE_FILE.read_text(encoding="utf-8")
                )
        except (OSError, ValueError):
            pass
        return {}

    def _save_cache(self):
        try:
            self.CACHE_DIR.mkdir(parents=True, exist_ok=True)
            temp_file = self.CACHE_FILE.with_suffix(".tmp")
            temp_file.write_text(
                json.dumps(self.cache, ensure_ascii=False),
                encoding="utf-8",
            )
            temp_file.replace(self.CACHE_FILE)
        except OSError:
            pass

    def _request(self, endpoint, params=None):
        cache_key = hashlib.sha256(
            json.dumps(
                [endpoint, params or {}],
                sort_keys=True,
                ensure_ascii=False,
            ).encode("utf-8")
        ).hexdigest()

        cached = self.cache.get(cache_key)

        if cached and time.time() - cached["time"] < self.CACHE_TTL:
            return cached["data"]

        for attempt in range(3):
            try:
                response = self.client.get(
                    f"{self.BASE_URL}/{endpoint.lstrip('/')}",
                    params=params,
                )
                response.raise_for_status()
                data = response.json()

                self.cache[cache_key] = {
                    "time": time.time(),
                    "data": data,
                }
                self._save_cache()
                return data

            except (httpx.HTTPError, ValueError):
                if attempt == 2:
                    return None
                time.sleep(attempt + 1)

        return None

    @staticmethod
    def _normalize(value):
        value = str(value or "").lower().strip()
        value = re.sub(r"[^a-z0-9]+", " ", value)
        return " ".join(value.split())

    @staticmethod
    def _english_name(name):
        parts = str(name or "").split("|")
        return parts[-1].strip() if len(parts) > 1 else parts[0].strip()

    @staticmethod
    def _slug_from_url(url):
        path = urlparse(url).path.strip("/")
        if path.startswith("perfumes/"):
            return path.split("/")[-1]
        return None



    def search(self, name, brand=None):
        english_name = self._english_name(name)
        query = self._normalize(english_name)

        if not query:
            return []

        data = self._request(
            "search",
            {"q": query, "kind": "perfume"},
        )

        if not data:
            return []

        return data.get("detail", {}).get("matches", [])






    def find_perfume(self, name, brand=None):
        target = self._normalize(self._english_name(name))

        if not target:
            return None

        matches = self.search(name, brand)

        brand_aliases = {
            "rabanne": ["paco rabanne", "rabanne"],
            "giorgio armani": [
                "giorgio armani",
                "emporio armani",
                "armani",
            ],
            "yves saint laurent": [
                "yves saint laurent",
                "ysl",
            ],
        }

        def remove_brand_prefix(text, house):
            text = self._normalize(text)
            house = self._normalize(house)

            prefixes = brand_aliases.get(house, [house])

            for prefix in sorted(prefixes, key=len, reverse=True):
                if text.startswith(prefix + " "):
                    return text[len(prefix):].strip()

            return text

        matched_slugs = set()

        for item in matches:
            if item.get("kind") != "perfume":
                continue

            house = item.get("house", "")
            candidate = self._normalize(item.get("name", ""))

            if not candidate or not house:
                continue

            clean_target = remove_brand_prefix(target, house)
            clean_candidate = remove_brand_prefix(candidate, house)

            if clean_target != clean_candidate:
                continue

            # Reject unrelated brands if the target
            # contains a recognized brand prefix.
            target_words = target.split()
            clean_words = clean_target.split()

            if target_words != clean_words:
                prefixes = brand_aliases.get(
                    self._normalize(house),
                    [self._normalize(house)],
                )
                if not any(
                    target.startswith(prefix + " ")
                    for prefix in prefixes
                ):
                    continue

            slug = self._slug_from_url(item.get("page", ""))

            if slug:
                matched_slugs.add(slug)

        if len(matched_slugs) == 1:
            return next(iter(matched_slugs))

        return None

        def matches_name(candidate, target):
            if candidate == target:
                return True

            # Allow brand/collection prefixes only.
            # Do not allow different fragrance-version suffixes.
            target_tokens = target.split()
            candidate_tokens = candidate.split()

            if len(target_tokens) < 3:
                return False

            return (
                len(candidate_tokens) > len(target_tokens)
                and candidate_tokens[-len(target_tokens):]
                == target_tokens
            )

        exact_candidates = []
        prefix_candidates = []

        for item in matches:
            if item.get("kind") != "perfume":
                continue

            slug = self._slug_from_url(item.get("page", ""))
            if not slug:
                continue

            candidate = self._normalize(item.get("name", ""))

            if candidate == target:
                exact_candidates.append(slug)

            elif matches_name(candidate, target):
                prefix_candidates.append(slug)

        if exact_candidates:
            return sorted(set(exact_candidates))[0]

        if len(set(prefix_candidates)) == 1:
            return prefix_candidates[0]

        return None


    def get_perfume(self, slug):
        if not slug:
            return None
        return self._request(f"perfumes/{slug}")

    def get_neighbours(self, slug):
        if not slug:
            return None
        return self._request(f"perfumes/{slug}/neighbours")

    def get_profile(self, name, brand=None):
        slug = self.find_perfume(name, brand)

        if not slug:
            return None

        return {
            "slug": slug,
            "perfume": self.get_perfume(slug),
            "neighbours": self.get_neighbours(slug),
        }

    def close(self):
        self.client.close()
