from pathlib import Path
import json
import time
import asyncio
from typing import Dict, Any, List, Optional

from django.conf import settings
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Perfume
from .serializers import QuestionnaireSerializer, PerfumeSerializer
from matcher.vectorizer import get_engine
from matcher.bridge_config import NOTE_CATEGORY_TO_TAGS

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


def _is_admin(request: HttpRequest) -> bool:
    expected = getattr(settings, "ADMIN_ACCESS_KEY", None)
    provided = request.headers.get("X-Admin-Key") or request.COOKIES.get("admin_key")
    return bool(expected) and provided == expected


def _unauthorized():
    return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(["POST"])
def recommend(request):
    """
    POST /api/recommend/
    Body: Questionnaire JSON
    Response: { profile_text, results: [...] }
    """
    serializer = QuestionnaireSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    engine = get_engine()
    result = engine.recommend(serializer.validated_data)
    return Response(result)


def _build_compact_perfume_json(perfume: Perfume) -> Dict[str, Any]:
    """Build compact JSON for OpenAI prompt."""
    return {
        "id": perfume.id,
        "name": perfume.name_fa or perfume.name_en or perfume.name or "",
        "brand": perfume.brand or "",
        "gender": perfume.gender or "",
        "family": perfume.family or "",
        "season": perfume.season or "",
        "notes": (perfume.all_notes or [])[:8],  # Limit to 8 notes
    }


def _build_rerank_prompt(answers: Dict[str, Any], perfumes: List[Dict[str, Any]]) -> str:
    """Build prompt for OpenAI rerank."""
    user_prefs = {
        "moods": answers.get("moods", [])[:6],
        "moments": answers.get("moments", [])[:6],
        "times": answers.get("times", [])[:3],
        "intensity": answers.get("intensity", [])[:3],
        "styles": answers.get("styles", [])[:4],
        "likedNotes": answers.get("noteLikes", [])[:6],
        "dislikedNotes": answers.get("noteDislikes", [])[:6],
    }
    
    perfume_lines = "\n".join(json.dumps(p, ensure_ascii=False) for p in perfumes)
    
    return f"""You are a perfume recommendation expert.

We have:
- "userPreferences": one JSON object.
- "perfumes": one JSON object per line.

Task:
1) Analyze userPreferences and perfumes.
2) Compute how well each perfume matches.
3) Return JSON: {{"rankings": [{{"id": number, "matchPercentage": 0-100, "reasons": [string]}}]}}

userPreferences: {json.dumps(user_prefs, ensure_ascii=False)}

perfumes:
{perfume_lines}

Return only valid JSON."""


@api_view(["POST"])
def recommend_rerank(request):
    """
    POST /api/recommend/rerank/
    Body: Questionnaire JSON
    Query: ?k=30 (top K to rerank, default 30)
    Response: { rankings: [...], fallback: bool, elapsedMs: number }
    """
    start_time = time.time()
    serializer = QuestionnaireSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    answers = serializer.validated_data
    top_k = min(int(request.GET.get("k", 30)), 50)  # Cap at 50
    timeout_ms = int(request.GET.get("timeout", 9000))  # Default 9s
    
    # Baseline matcher
    engine = get_engine()
    baseline = engine.recommend(answers)
    baseline_results = baseline.get("results", [])
    candidates = baseline_results[:top_k]
    
    if not candidates:
        return Response(
            {
                "rankings": [],
                "fallback": True,
                "elapsedMs": int((time.time() - start_time) * 1000),
            }
        )
    
    # Load full perfume objects for top K
    candidate_ids = [item.get("id") for item in candidates]
    perfumes = Perfume.objects.filter(id__in=candidate_ids)
    perfume_map = {p.id: p for p in perfumes}
    
    # Build compact JSON for OpenAI
    compact_perfumes = [
        _build_compact_perfume_json(perfume_map[pid])
        for pid in candidate_ids
        if pid in perfume_map
    ]
    
    if not OPENAI_AVAILABLE or not settings.OPENAI_API_KEY:
        # Fallback: return baseline scores
        rankings = [
            {
                "id": item.get("id"),
                "matchPercentage": max(0, min(100, round((item.get("score") or 0) * 100))),
                "reasons": [],
            }
            for item in candidates
        ]
        return Response(
            {
                "rankings": rankings,
                "fallback": True,
                "elapsedMs": int((time.time() - start_time) * 1000),
            }
        )
    
    # Call OpenAI with timeout
    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        prompt = _build_rerank_prompt(answers, compact_perfumes)
        
        # Use asyncio timeout wrapper for synchronous call
        def call_openai():
            response = client.chat.completions.create(
                model=getattr(settings, "AI_MODEL", "gpt-5-nano"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are a perfume recommendation expert. Analyze user preferences and match them with available perfumes. Return only valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            return response
        
        # Run with timeout
        try:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(call_openai)
                ai_response = future.result(timeout=timeout_ms / 1000.0)
        except concurrent.futures.TimeoutError:
            raise TimeoutError(f"OpenAI call exceeded {timeout_ms}ms")
        
        content = ai_response.choices[0].message.content if hasattr(ai_response, "choices") else None
        if not content:
            raise ValueError("No content in OpenAI response")
        
        parsed = json.loads(content)
        ai_rankings = parsed.get("rankings", [])
        
        if not ai_rankings:
            raise ValueError("Empty rankings from OpenAI")
        
        # Normalize and validate rankings
        rankings = []
        seen_ids = set()
        for item in ai_rankings:
            pid = int(item.get("id", 0))
            if pid in candidate_ids and pid not in seen_ids:
                seen_ids.add(pid)
                rankings.append({
                    "id": pid,
                    "matchPercentage": max(0, min(100, int(item.get("matchPercentage", 0)))),
                    "reasons": item.get("reasons", [])[:3] if isinstance(item.get("reasons"), list) else [],
                })
        
        # Fill missing IDs with baseline scores
        for item in candidates:
            if item.get("id") not in seen_ids:
                rankings.append({
                    "id": item.get("id"),
                    "matchPercentage": max(0, min(100, round((item.get("score") or 0) * 100))),
                    "reasons": [],
                })
        
        elapsed_ms = int((time.time() - start_time) * 1000)
        return Response(
            {
                "rankings": rankings[:top_k],
                "fallback": False,
                "elapsedMs": elapsed_ms,
            }
        )
        
    except (TimeoutError, ValueError, KeyError, json.JSONDecodeError, Exception) as e:
        # Fallback to baseline on any error
        rankings = [
            {
                "id": item.get("id"),
                "matchPercentage": max(0, min(100, round((item.get("score") or 0) * 100))),
                "reasons": [],
            }
            for item in candidates
        ]
        elapsed_ms = int((time.time() - start_time) * 1000)
        return Response(
            {
                "rankings": rankings,
                "fallback": True,
                "elapsedMs": elapsed_ms,
                "error": str(e) if settings.DEBUG else None,
            }
        )


@api_view(["GET"])
def perfumes(request):
    """
    GET /api/perfumes/
    Returns the catalog from the database.
    """
    queryset = Perfume.objects.order_by("brand", "name_fa", "name_en")
    serializer = PerfumeSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(["GET", "POST"])
def admin_perfumes(request: HttpRequest):
    if not _is_admin(request):
        return _unauthorized()

    if request.method == "GET":
        queryset = Perfume.objects.order_by("brand", "name")
        serializer = PerfumeSerializer(queryset, many=True)
        return Response(serializer.data)

    serializer = PerfumeSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
def admin_perfume_detail(request: HttpRequest, pk: int):
    if not _is_admin(request):
        return _unauthorized()

    perfume = get_object_or_404(Perfume, pk=pk)

    if request.method == "GET":
        serializer = PerfumeSerializer(perfume)
        return Response(serializer.data)

    if request.method in ["PUT", "PATCH"]:
        serializer = PerfumeSerializer(
            perfume, data=request.data, partial=request.method == "PATCH"
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    perfume.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
