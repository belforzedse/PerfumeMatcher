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
)
from .note_normalization import normalize_note_label


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
    if gender and gender != "unisex":
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


def _adapt_perfume(raw: Dict[str, Any]) -> Perfume:
    """
    Normalize raw perfume dict into Perfume dataclass:
    - Accept alternate field names (nameFa/nameEn, accords/mainAccords, strength).
    - Coerce scalar fields to lists where needed.
    - Default missing fields to sensible empties.
    """
    pid = str(raw.get("id") or raw.get("slug") or raw.get("pk") or "")
    name = str(raw.get("nameFa") or raw.get("name_fa") or raw.get("name") or "")
    brand = str(raw.get("brand") or raw.get("brandFa") or raw.get("brand_fa") or "")
    gender = raw.get("gender") or None
    family = raw.get("family") or raw.get("category") or None

    main_accords = _ensure_list(
        raw.get("main_accords")
        or raw.get("accords")
        or raw.get("mainAccords")
        or raw.get("accordsFa")
    )
    top_notes = _ensure_list(raw.get("top_notes") or raw.get("topNotes"))
    heart_notes = _ensure_list(raw.get("heart_notes") or raw.get("middle_notes") or raw.get("heartNotes"))
    base_notes = _ensure_list(raw.get("base_notes") or raw.get("baseNotes"))

    # Fallback: if only a flat notes array exists, treat as heart notes
    if not (top_notes or heart_notes or base_notes):
        flat_notes = _ensure_list(raw.get("notes") or raw.get("allNotes"))
        heart_notes = flat_notes

    seasons = _ensure_list(raw.get("seasons") or raw.get("season"))
    occasions = _ensure_list(raw.get("occasions") or raw.get("context") or raw.get("contexts"))
    intensity = raw.get("intensity") or raw.get("strength")

    return Perfume(
        id=pid,
        name=name,
        brand=brand,
        gender=gender,
        family=family,
        main_accords=main_accords,
        top_notes=top_notes,
        heart_notes=heart_notes,
        base_notes=base_notes,
        seasons=seasons,
        occasions=occasions,
        intensity=intensity,
    )


def load_perfumes() -> List[Perfume]:
    """
    Load perfumes from the database.
    """
    return list(Perfume.objects.all())


def _collect_normalized_notes(p: Perfume) -> List[str]:
    notes_top = p.notes_top if isinstance(p.notes_top, list) else (p.notes_top or [])
    notes_middle = p.notes_middle if isinstance(p.notes_middle, list) else (p.notes_middle or [])
    notes_base = p.notes_base if isinstance(p.notes_base, list) else (p.notes_base or [])
    merged = list(notes_top) + list(notes_middle) + list(notes_base)
    return [_normalize_note(str(n)) for n in merged]


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
        avoid_very_sweet = qdata.get("avoid_very_sweet", False)
        avoid_oud = qdata.get("avoid_oud", False)
        contexts = qdata.get("contexts", [])
        moments = qdata.get("moments", [])
        intensities = qdata.get("intensity", [])

        # Precompute disliked note tokens
        disliked_tokens: Set[str] = set()
        for category in qdata.get("noteDislikes", []):
            for raw in NOTE_CATEGORY_TO_TAGS.get(category, []):
                disliked_tokens.add(_normalize_note(raw))

        for idx, base_score in enumerate(sims):
            score = float(base_score)
            perfume = self.perfumes[idx]

            if avoid_very_sweet and self.perfume_is_very_sweet[idx]:
                score -= 0.2

            if avoid_oud and self.perfume_has_oud[idx]:
                score -= 0.2

            if "office" in contexts and perfume.intensity:
                if perfume.intensity in ("strong", "very_strong"):
                    score -= 0.15

            if moments and perfume.occasions:
                occasions_list = perfume.occasions if isinstance(perfume.occasions, list) else []
                if "night_out" in occasions_list and "daily" in moments:
                    score -= 0.05

            if intensities and perfume.intensity:
                if "light" in intensities and perfume.intensity in ("strong", "very_strong"):
                    score -= 0.15
                if "strong" in intensities and perfume.intensity == "soft":
                    score -= 0.1

            if disliked_tokens:
                perfume_tokens = set(_collect_normalized_notes(perfume))
                if perfume_tokens & disliked_tokens:
                    score -= 0.2

            adjusted_scores.append(score)

        top_k = qdata.get("limit", 10)
        idx_sorted = sorted(
            range(len(self.perfumes)),
            key=lambda i: adjusted_scores[i],
            reverse=True,
        )[:top_k]

        results = []
        for idx in idx_sorted:
            p = self.perfumes[idx]
            score = adjusted_scores[idx]
            # Convert score (0-1) to matchPercentage (0-100)
            match_percentage = max(0, min(100, round(score * 100)))
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


def get_engine() -> PerfumeEngine:
    """
    Lazy-create a single engine instance and reuse it for all requests.
    """
    global _engine_instance
    if _engine_instance is None:
        perfumes = load_perfumes()
        _engine_instance = PerfumeEngine(perfumes)
    return _engine_instance
