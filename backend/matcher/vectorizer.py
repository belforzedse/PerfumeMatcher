import time
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
import os
import math
import json

from django.conf import settings
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from openai import OpenAI

from api.models import Perfume  # use Django model
from .bridge_config import (
    CONTEXT_TO_NOTE_TAGS,
    CONTEXT_TO_OCCASION_TAGS,
    FRESH_NOTES,
    MOMENT_TO_NOTE_TAGS,
    MOMENT_TO_OCCASION_TAGS,
    MOOD_TO_NOTE_TAGS,
    NOTE_CATEGORY_TO_TAGS,
    STYLE_TO_GENDER_TOKENS,
    SWEET_NOTES,
    TIME_TO_OCCASION_TAGS,
    SCENT_TRAIT_TO_NOTES,
)
from .note_normalization import normalize_note_label


def _score_to_match_percentage(score: float) -> int:
    """
    Safely convert a similarity score to a match percentage (0-100).
    Handles infinity values gracefully:
    - float('-inf') -> 0
    - float('inf') -> 100
    - Normal values -> clamped to 0-100
    """
    if math.isinf(score):
        return 0 if score < 0 else 100
    return max(0, min(100, round(score * 100)))


def _normalize_token(s: str) -> str:
    """
    Unicode-friendly normalizer:
    - keep Persian letters
    - underscore internal whitespace
    - strip punctuation
    """
    s = s.strip()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^\w_]", "", s, flags=re.UNICODE)
    return s


def _normalize_note(raw: str) -> str:
    base = normalize_note_label(raw)
    return _normalize_token(base)

def _trait_adjustment(
    preferences: Dict[str, int],
    perfume_notes: Set[str],
) -> float:
    adjustment = 0.0

    for trait, preference in preferences.items():
        cues = SCENT_TRAIT_TO_NOTES.get(trait, [])

        if (
            not cues
            or not isinstance(preference, int)
            or isinstance(preference, bool)
        ):
            continue

        normalized_cues = {
            _normalize_note(note) for note in cues
        }

        matches = len(normalized_cues & perfume_notes)

        if not matches:
            continue

        evidence = min(matches, 2) / 2

        adjustment += (
            (preference - 3) / 2
        ) * 0.08 * evidence

    return max(-0.20, min(0.20, adjustment))

def perfume_to_text(p: Perfume) -> str:
    """
    Build weighted tokens for a perfume:
      - base > heart > top weights
      - main accords strongly weighted
      - include generic note_ tokens for alignment with questionnaire
    """
    parts: List[str] = []

    if p.family:
        parts.append(f"family_{_normalize_token(p.family)}")

    # Notes - Django model uses notes_top, notes_middle, notes_base
    notes_top = p.notes_top if isinstance(p.notes_top, list) else (p.notes_top or [])
    notes_middle = p.notes_middle if isinstance(p.notes_middle, list) else (p.notes_middle or [])
    notes_base = p.notes_base if isinstance(p.notes_base, list) else (p.notes_base or [])

    for note in notes_top:
        n = _normalize_note(str(note))
        parts.append(f"topnote_{n}")
        parts.append(f"note_{n}")

    for note in notes_middle:
        n = _normalize_note(str(note))
        for _ in range(2):
            parts.append(f"heartnote_{n}")
            parts.append(f"note_{n}")

    for note in notes_base:
        n = _normalize_note(str(note))
        for _ in range(3):
            parts.append(f"basenote_{n}")
            parts.append(f"note_{n}")

    # Main accords - strongly weighted (2x repetition for emphasis)
    main_accords = p.main_accords if isinstance(p.main_accords, list) else (p.main_accords or [])
    for accord in main_accords:
        normalized = _normalize_note(str(accord))
        # Repeat twice to give accords strong weight (they summarize the perfume)
        for _ in range(2):
            parts.append(f"accord_{normalized}")
            parts.append(f"note_{normalized}")  # Also add as note for crossover matching

    # Occasions - standard weight (1x)
    occasions_list = p.occasions if isinstance(p.occasions, list) else (p.occasions or [])
    for occasion in occasions_list:
        normalized = _normalize_token(str(occasion))
        parts.append(f"occasion_{normalized}")

    if p.gender:
        parts.append(f"gender_{p.gender}")

    # Handle both single season and seasons list
    if p.season:
        parts.append(f"season_{_normalize_token(p.season)}")
    seasons_list = p.seasons if isinstance(p.seasons, list) else []
    for season in seasons_list:
        parts.append(f"season_{_normalize_token(str(season))}")

    if p.intensity:
        parts.append(f"intensity_{_normalize_token(p.intensity)}")

    return " ".join(parts)


def questionnaire_to_profile_text(q: Dict[str, Any]) -> str:
    """
    Convert questionnaire (new kiosk shape + legacy) into matcher tokens.
    - moods/moments/times map to notes + occasion tokens
    - noteLikes expand to note_/accord_ tokens
    - noteDislikes expand to avoid_ tokens (handled in scoring, still encoded here)
    - legacy contexts/sweetness/freshness/strength/gender are honored when present
    """
    parts: List[str] = []

    # moods
    for mood in q.get("moods", []):
        for note in MOOD_TO_NOTE_TAGS.get(mood, []):
            n = _normalize_note(note)
            parts.append(f"note_{n}")
            parts.append(f"accord_{n}")

    # moments
    for moment in q.get("moments", []):
        for note in MOMENT_TO_NOTE_TAGS.get(moment, []):
            n = _normalize_note(note)
            parts.append(f"note_{n}")
        for occ in MOMENT_TO_OCCASION_TAGS.get(moment, []):
            parts.append(f"occasion_{occ}")

    # times
    for time_of_day in q.get("times", []):
        for occ in TIME_TO_OCCASION_TAGS.get(time_of_day, []):
            parts.append(f"occasion_{occ}")

    # intensity (new)
    for intensity in q.get("intensity", []):
        parts.append(f"intensity_{_normalize_token(intensity)}")

    # styles
    for style in q.get("styles", []):
        for token in STYLE_TO_GENDER_TOKENS.get(style, []):
            parts.append(token)

    # note likes / dislikes (dislikes mainly penalized later)
    for category in q.get("noteLikes", []):
        for note in NOTE_CATEGORY_TO_TAGS.get(category, []):
            n = _normalize_note(note)
            parts.append(f"note_{n}")
            parts.append(f"accord_{n}")

    for category in q.get("noteDislikes", []):
        for note in NOTE_CATEGORY_TO_TAGS.get(category, []):
            n = _normalize_note(note)
            parts.append(f"avoid_note_{n}")

    # legacy contexts
    for ctx in q.get("contexts", []):
        for note in CONTEXT_TO_NOTE_TAGS.get(ctx, []):
            n = _normalize_note(note)
            parts.append(f"note_{n}")
        for occ in CONTEXT_TO_OCCASION_TAGS.get(ctx, []):
            parts.append(f"occasion_{occ}")

    # legacy sliders
    sweetness = max(0, min(5, int(q.get("sweetness") or 0)))
    for _ in range(sweetness):
        parts.append("axis_sweet")
        for raw in SWEET_NOTES:
            n = _normalize_note(raw)
            parts.append(f"axis_sweet_note_{n}")

    freshness = max(0, min(5, int(q.get("freshness") or 0)))
    for _ in range(freshness):
        parts.append("axis_fresh")
        for raw in FRESH_NOTES:
            n = _normalize_note(raw)
            parts.append(f"axis_fresh_note_{n}")

    # legacy strength/gender
    strength = q.get("strength")
    if strength:
        parts.append(f"intensity_{_normalize_token(strength)}")

    gender = q.get("gender")
    if isinstance(gender, list):
        gender = gender[0] if gender else None
    if gender:
        gender = str(gender).strip().lower()
        if gender != "unisex":
            parts.append(f"gender_{gender}")

    return " ".join(parts)


def _ensure_list(val) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return [str(x) for x in val if x is not None]
    if isinstance(val, str):
        return [val]
    return []


def _collect_normalized_notes(p: Perfume) -> List[str]:
    notes_top = p.notes_top if isinstance(p.notes_top, list) else (p.notes_top or [])
    notes_middle = p.notes_middle if isinstance(p.notes_middle, list) else (p.notes_middle or [])
    notes_base = p.notes_base if isinstance(p.notes_base, list) else (p.notes_base or [])
    merged = list(notes_top) + list(notes_middle) + list(notes_base)
    return [_normalize_note(str(n)) for n in merged]

def _favorite_perfume_adjustment(
    candidate: Perfume,
    favorites: List[Dict[str, Any]],
    perfume_lookup: Dict[int, Perfume],
) -> float:
    if not favorites:
        return 0.0

    candidate_notes = set(
        _collect_normalized_notes(candidate)
    )

    if not candidate_notes:
        return 0.0

    scores = []

    for favorite in favorites:
        try:
            favorite_id = int(favorite["id"])
        except (ValueError, TypeError, KeyError):
            continue

        reference = perfume_lookup.get(favorite_id)

        if reference is None:
            continue

        reference_notes = set(
            _collect_normalized_notes(reference)
        )

        if not reference_notes:
            continue

        reasons = set(
            favorite.get("likedFeatures", [])
        )

        # شباهت کلی براساس نت‌های مشترک
        common_notes = candidate_notes & reference_notes
        all_notes = candidate_notes | reference_notes

        overall_similarity = (
            len(common_notes) / len(all_notes)
            if all_notes
            else 0.0
        )

        score = 0.0

        # اگر دلیل مشخص نشده، شباهت کلی معیار است
        if not reasons or "overall" in reasons:
            score += 0.14 * overall_similarity

        # تطبیق دلایل مرتبط با رایحه
        scent_reasons = {
            "sweetness",
            "freshness",
            "warmth",
            "woody",
        }

        selected_scent_reasons = reasons & scent_reasons

        for reason in selected_scent_reasons:
            cues = {
                _normalize_note(note)
                for note in SCENT_TRAIT_TO_NOTES.get(
                    reason, []
                )
            }

            reference_cues = reference_notes & cues

            if not reference_cues:
                continue

            candidate_cues = candidate_notes & reference_cues

            similarity = (
                len(candidate_cues) /
                len(reference_cues)
            )

            score += (
                0.14 /
                max(1, len(selected_scent_reasons))
            ) * similarity

        # پخش بو و ماندگاری فعلاً امتیاز نمی‌گیرند؛
        # چون اطلاعات معتبر برای مقایسه نداریم.
        scores.append(min(score, 0.14))

    if not scores:
        return 0.0

    # میانگین شباهت، بدون امتیاز اضافی برای تعداد عطرها
    return sum(scores) / len(scores)

def _scento_adjustment(perfume, preferences, index):
    """
    Small supplementary score from Scento.
    Missing Scento data never excludes a product.
    """
    data = index.get(str(perfume.id))

    if not isinstance(data, dict):
        return 0.0

    words = {
        str(word).lower().strip()
        for word in (data.get("character_words") or [])
    }

    if not words or not isinstance(preferences, dict):
        return 0.0

    trait_words = {
        "sweetness": {"sweet", "sugary", "gourmand"},
        "freshness": {"fresh", "citrusy", "aquatic"},
        "warmth": {"warm"},
        "bitterness": {"bitter"},
        "powdery": {"powdery"},
        "woodiness": {"woody"},
        "woody": {"woody"},
    }

    adjustment = 0.0

    for trait, value in preferences.items():
        if type(value) is not int or not 1 <= value <= 5:
            continue

        cues = trait_words.get(trait, set())

        if words & cues:
            adjustment += ((value - 3) / 2) * 0.04

    return max(-0.08, min(0.08, adjustment))


class PerfumeEngine:
    """
    Holds:
      - all perfumes
      - TF-IDF vectorizer
      - TF-IDF matrix
    And exposes:
      - recommend(qdata) -> { profile_text, results[] }
    """

    def __init__(self, perfumes: List[Perfume]):
        self.perfumes = perfumes

        index_path = (
            Path(__file__).resolve().parent.parent
            / ".cache"
            / "scento_index.json"
        )

        self.scento_index = {}

        try:
            if index_path.exists():
                loaded = json.loads(
                    index_path.read_text(encoding="utf-8")
                )
                if isinstance(loaded, dict):
                    self.scento_index = loaded
        except (OSError, ValueError):
            pass

        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
        docs = [perfume_to_text(p) for p in perfumes]
        self.matrix = self.vectorizer.fit_transform(docs)
        self.perfume_is_very_sweet: List[bool] = []
        self.perfume_has_oud: List[bool] = []
        self._precompute_perfume_attributes()

    def _precompute_perfume_attributes(self) -> None:
        sweet_targets = {_normalize_note(n) for n in SWEET_NOTES}
        oud_targets = {_normalize_note("عود"), _normalize_token("عود"), "oud"}

        for p in self.perfumes:
            note_tokens = set(_collect_normalized_notes(p))
            self.perfume_is_very_sweet.append(any(tok in sweet_targets for tok in note_tokens))
            self.perfume_has_oud.append(any(tok in oud_targets for tok in note_tokens))

    def recommend(self, qdata: Dict[str, Any]) -> Dict[str, Any]:
        profile_text = questionnaire_to_profile_text(qdata)
        q_vec = self.vectorizer.transform([profile_text])
        sims = cosine_similarity(q_vec, self.matrix)[0]  # (N,)

        adjusted_scores: List[float] = []
        eligible_indices: List[int] = []
        avoid_very_sweet = qdata.get("avoid_very_sweet", False)
        avoid_oud = qdata.get("avoid_oud", False)
        contexts = qdata.get("contexts", [])
        moments = qdata.get("moments", [])
        intensities = qdata.get("intensity", [])

        # Build gender allowlist (styles + legacy gender). If empty => no filter.
        allowed_genders: Set[str] = set()
        filter_by_gender = False

        styles = qdata.get("styles", []) or []
        if styles and "any" not in styles:
            filter_by_gender = True
            if "feminine" in styles:
                allowed_genders.update({"female", "unisex"})
            if "masculine" in styles:
                allowed_genders.update({"male", "unisex"})
            if "unisex" in styles:
                allowed_genders.add("unisex")

        legacy_gender = qdata.get("gender")
        if isinstance(legacy_gender, list):
            legacy_gender = legacy_gender[0] if legacy_gender else None
        if legacy_gender:
            gender_value = str(legacy_gender).strip().lower()
            filter_by_gender = True
            allowed_genders = {gender_value}

                # Precompute disliked note tokens
        disliked_tokens: Set[str] = set()

        for category in qdata.get("noteDislikes", []):
            for raw in NOTE_CATEGORY_TO_TAGS.get(category, []):
                disliked_tokens.add(_normalize_note(raw))

        trait_preferences = qdata.get("scentTraits", {}) or {}
        favorite_perfumes = (
            qdata.get("favoritePerfumes", []) or []
        )

        perfume_lookup = {
            perfume.id: perfume
            for perfume in self.perfumes
        }

        for idx, base_score in enumerate(sims):
            score = float(base_score)
            perfume = self.perfumes[idx]

            if filter_by_gender:
                perfume_gender = (perfume.gender or "unisex").lower()
                if allowed_genders and perfume_gender not in allowed_genders:
                    continue

            if avoid_very_sweet and self.perfume_is_very_sweet[idx]:
                score -= 0.2

            if avoid_oud and self.perfume_has_oud[idx]:
                score -= 0.2

            if "office" in contexts and perfume.intensity:
                if perfume.intensity in ("strong", "very_strong"):
                    score -= 0.15

            if moments and perfume.occasions:
                occasions_list = (
                    perfume.occasions
                    if isinstance(perfume.occasions, list)
                    else []
                )

                if "night_out" in occasions_list and "daily" in moments:
                    score -= 0.05

            if intensities and perfume.intensity:
                if (
                    "light" in intensities
                    and perfume.intensity in ("strong", "very_strong")
                ):
                    score -= 0.15

                if (
                    "strong" in intensities
                    and perfume.intensity == "soft"
                ):
                    score -= 0.1

            # Apply disliked-note penalties
            perfume_tokens = set(
                _collect_normalized_notes(perfume)
            )

            if disliked_tokens:
                overlap = perfume_tokens & disliked_tokens

                if overlap:
                    score -= min(
                        0.45,
                        0.20 + 0.05 * (len(overlap) - 1),
                    )

            # Apply six scent trait preferences
            if trait_preferences:
                score += _trait_adjustment(
                    trait_preferences,
                    perfume_tokens,
                )
                score += _scento_adjustment(
                perfume,
                trait_preferences,
                self.scento_index,
                )
            if favorite_perfumes:
                score += _favorite_perfume_adjustment(
                    candidate=perfume,
                    favorites=favorite_perfumes,
                    perfume_lookup=perfume_lookup,
                )

            adjusted_scores.append(score)
            eligible_indices.append(idx)

        top_k = qdata.get("limit", 10)
        idx_sorted = sorted(
            range(len(eligible_indices)),
            key=lambda i: adjusted_scores[i],
            reverse=True,
        )[:top_k]

        results = []
        for ranked_idx in idx_sorted:
            idx = eligible_indices[ranked_idx]
            p = self.perfumes[idx]
            score = adjusted_scores[ranked_idx]
            # Convert score (0-1) to matchPercentage (0-100)
            # Handle infinity values safely
            match_percentage = _score_to_match_percentage(score)
            results.append(
                {
                    "id": p.id,
                    "name": p.name or p.name_fa or p.name_en or "",
                    "brand": p.brand or "",
                    "score": score,
                    "matchPercentage": match_percentage,
                }
            )

        return {"profile_text": profile_text, "results": results}


# ---- singleton helper -------------------------------------------------------


_engine_instance: Optional[PerfumeEngine] = None
_engine_loaded_at = 0.0


def get_engine() -> PerfumeEngine:
    global _engine_instance, _engine_loaded_at

    # Refresh catalog every 15 minutes
    expired = time.monotonic() - _engine_loaded_at > 900

    if _engine_instance is None or expired:
        from .gandom_catalog import load_gandom_perfumes

        try:
            perfumes = load_gandom_perfumes()

            if not perfumes:
                raise RuntimeError(
                    "No available Gandom perfumes found"
                )

            new_engine = PerfumeEngine(perfumes)

            _engine_instance = new_engine
            _engine_loaded_at = time.monotonic()

        except Exception:
            if _engine_instance is None:
                raise

            # Keep previous catalog if WooCommerce is unavailable
            _engine_loaded_at = time.monotonic()

    return _engine_instance
