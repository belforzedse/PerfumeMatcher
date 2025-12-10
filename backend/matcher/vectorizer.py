import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
import os
import math

from django.conf import settings
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from openai import OpenAI

from .bridge_config import (
    CONTEXT_TO_NOTE_TAGS,
    CONTEXT_TO_OCCASION_TAGS,
    FRESH_NOTES,
    MOOD_TO_NOTE_TAGS,
    SWEET_NOTES,
)
from .models import Perfume
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

    for acc in p.main_accords:
        n = _normalize_note(acc)
        for _ in range(3):
            parts.append(f"accord_{n}")

    for note in p.top_notes:
        n = _normalize_note(note)
        parts.append(f"topnote_{n}")
        parts.append(f"note_{n}")

    for note in p.heart_notes:
        n = _normalize_note(note)
        for _ in range(2):
            parts.append(f"heartnote_{n}")
            parts.append(f"note_{n}")

    for note in p.base_notes:
        n = _normalize_note(note)
        for _ in range(3):
            parts.append(f"basenote_{n}")
            parts.append(f"note_{n}")

    if p.gender:
        parts.append(f"gender_{p.gender}")

    for s in p.seasons:
        parts.append(f"season_{s}")

    for o in p.occasions:
        parts.append(f"occasion_{o}")

    if p.intensity:
        parts.append(f"intensity_{_normalize_token(p.intensity)}")

    return " ".join(parts)


def questionnaire_to_profile_text(q: Dict[str, Any]) -> str:
    """
    Convert vibe-based questionnaire into matcher tokens.
    - moods/contexts map to Persian notes -> note_/accord_ tokens
    - contexts optionally map to occasion_ tokens
    - sweetness/freshness become repeated axis tokens with representative notes
    - strength -> intensity_
    - gender -> gender_ (if not unisex)
    """
    parts: List[str] = []

    for mood in q.get("moods", []):
        for note in MOOD_TO_NOTE_TAGS.get(mood, []):
            n = _normalize_note(note)
            parts.append(f"note_{n}")
            parts.append(f"accord_{n}")

    for ctx in q.get("contexts", []):
        for note in CONTEXT_TO_NOTE_TAGS.get(ctx, []):
            n = _normalize_note(note)
            parts.append(f"note_{n}")
        for occ in CONTEXT_TO_OCCASION_TAGS.get(ctx, []):
            parts.append(f"occasion_{occ}")

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
    Load perfumes from perfumes.json at the project root and adapt to matcher schema.
    """
    path: Path = settings.BASE_DIR / "perfumes.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    return [_adapt_perfume(item) for item in data]


# ---- AI rerank helpers -------------------------------------------------------

def _to_ai_payload(perfumes: List[Perfume], answers: Dict[str, Any], limit: int = 40) -> Dict[str, Any]:
    top = perfumes[:limit]
    items = []
    for p in top:
        items.append(
            {
                "id": p.id,
                "name": p.name,
                "brand": p.brand,
                "family": p.family,
                "mainAccords": p.main_accords[:6],
                "topNotes": p.top_notes[:6],
                "heartNotes": p.heart_notes[:6],
                "baseNotes": p.base_notes[:6],
                "seasons": p.seasons[:4],
                "occasions": p.occasions[:4],
                "intensity": p.intensity,
            }
        )

    prefs = {
        "moods": (answers.get("moods") or [])[:6],
        "contexts": (answers.get("contexts") or [])[:6],
        "sweetness": answers.get("sweetness"),
        "freshness": answers.get("freshness"),
        "strength": answers.get("strength"),
        "gender": answers.get("gender"),
    }

    return {"preferences": prefs, "candidates": items}


def _ai_rerank(payload: Dict[str, Any]) -> Optional[List[Dict[str, Any]]]:
    api_key = os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY")
    model = os.getenv("AI_MODEL") or "gpt-5-nano"
    if not api_key:
        return None

    client = OpenAI(api_key=api_key)

    # Compact prompt; ask for JSON array with capped reasons
    system_prompt = (
        "You are a perfume recommendation expert. "
        "Given user preferences and candidate perfumes, return JSON: "
        "{\"rankings\":[{\"id\":\"...\",\"matchPercentage\":90,\"reasons\":[\"...\",\"...\"]}]}. "
        "Limit reasons to at most 2 short items. Match percentage 1-100."
    )

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            temperature=0.2,
            max_tokens=320,
            response_format={"type": "json_object"},
            timeout=12,
        )
        content = completion.choices[0].message.content if completion.choices else None
        if not content:
            return None
        parsed = json.loads(content)
        rankings = parsed.get("rankings") if isinstance(parsed, dict) else parsed
        if not isinstance(rankings, list):
            return None
        out = []
        for item in rankings:
            try:
                out.append(
                    {
                        "id": str(item.get("id") or ""),
                        "matchPercentage": max(1, min(100, int(item.get("matchPercentage") or 0))),
                        "reasons": item.get("reasons") if isinstance(item.get("reasons"), list) else [],
                    }
                )
            except Exception:
                continue
        return out or None
    except Exception:
        return None


def _collect_normalized_notes(p: Perfume) -> List[str]:
    merged = list(p.top_notes) + list(p.heart_notes) + list(p.base_notes) + list(p.main_accords)
    return [_normalize_note(n) for n in merged]


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

            adjusted_scores.append(score)

        top_k = qdata.get("limit", 10)
        idx_sorted = sorted(
            range(len(self.perfumes)),
            key=lambda i: adjusted_scores[i],
            reverse=True,
        )[:top_k]

        # Build local candidates payload (sorted)
        candidates = []
        for idx in idx_sorted:
            p = self.perfumes[idx]
            candidates.append(
                {
                    "id": p.id,
                    "name": p.name,
                    "brand": p.brand,
                    "family": p.family,
                    "main_accords": p.main_accords,
                    "top_notes": p.top_notes,
                    "heart_notes": p.heart_notes,
                    "base_notes": p.base_notes,
                    "seasons": p.seasons,
                    "occasions": p.occasions,
                    "intensity": p.intensity,
                    "score": adjusted_scores[idx],
                }
            )

        # Prepare AI payload from top candidates
        ai_payload = _to_ai_payload([c for c in (self.perfumes[i] for i in idx_sorted)], qdata, limit=min(40, len(idx_sorted)))
        ai_rankings = _ai_rerank(ai_payload)

        results = []
        if ai_rankings:
            # Map AI rankings to full info; fallback to local score ordering if missing
            ai_map = {r["id"]: r for r in ai_rankings if r.get("id")}
            for idx in idx_sorted:
                p = self.perfumes[idx]
                ar = ai_map.get(p.id)
                if ar:
                    results.append(
                        {
                            "id": p.id,
                            "name": p.name,
                            "brand": p.brand,
                            "matchPercentage": ar["matchPercentage"],
                            "reasons": ar.get("reasons") or [],
                            "score": adjusted_scores[idx],
                        }
                    )
            # If AI returned fewer, fill remaining from local (optional)
            if len(results) < len(idx_sorted):
                used = {r["id"] for r in results}
                for idx in idx_sorted:
                    p = self.perfumes[idx]
                    if p.id in used:
                        continue
                    results.append(
                        {
                            "id": p.id,
                            "name": p.name,
                            "brand": p.brand,
                            "matchPercentage": int(max(1, min(100, adjusted_scores[idx] * 100))),
                            "reasons": [],
                            "score": adjusted_scores[idx],
                        }
                    )
        else:
            # Local-only fallback
            for idx in idx_sorted:
                p = self.perfumes[idx]
                pct = int(max(1, min(100, adjusted_scores[idx] * 100)))
                results.append(
                    {
                        "id": p.id,
                        "name": p.name,
                        "brand": p.brand,
                        "matchPercentage": pct,
                        "reasons": [],
                        "score": adjusted_scores[idx],
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
