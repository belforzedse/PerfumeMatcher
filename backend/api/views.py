from pathlib import Path
import json
import time
import asyncio
import logging
from typing import Dict, Any, List, Optional

import httpx
from django.conf import settings
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from openai import OpenAI, APIError, BadRequestError, APITimeoutError

from .models import Brand, Collection, Perfume
from .serializers import BrandSerializer, CollectionSerializer, QuestionnaireSerializer, PerfumeSerializer
from .notes_master import get_all_notes, get_notes_by_category
from matcher.vectorizer import get_engine
from matcher.bridge_config import NOTE_CATEGORY_TO_TAGS

logger = logging.getLogger(__name__)

# Check if OpenAI is available (already imported above)
OPENAI_AVAILABLE = True
try:
    # Verify OpenAI classes are available
    _ = OpenAI, APIError, BadRequestError, APITimeoutError
except NameError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI library not available")


def _safe_score_to_percentage(score: float) -> int:
    """
    Safely convert a similarity score to a match percentage (0-100).
    Handles infinity values gracefully:
    - float('-inf') -> 0
    - float('inf') -> 100
    - None -> 0
    - Normal values -> clamped to 0-100
    """
    import math
    if score is None:
        return 0
    if math.isinf(score):
        return 0 if score < 0 else 100
    return max(0, min(100, round(score * 100)))


def _is_admin(request: HttpRequest) -> bool:
    expected = getattr(settings, "ADMIN_ACCESS_KEY", None)
    if not expected:
        logger.warning("ADMIN_ACCESS_KEY not set in settings")
        return False

    # Try multiple ways to get the header (Django/DRF compatibility)
    provided = (
        request.headers.get("X-Admin-Key") or  # DRF Request object
        request.META.get("HTTP_X_ADMIN_KEY") or  # Standard Django (X-Admin-Key -> HTTP_X_ADMIN_KEY)
        request.META.get("X-Admin-Key") or  # Direct access
        request.COOKIES.get("admin_key")  # Cookie fallback
    )

    # Debug logging (log to help diagnose - shows first/last chars for verification)
    if provided != expected:
        logger.warning(
            f"Admin auth failed for {request.path}: "
            f"header present={bool(provided)}, "
            f"expected length={len(expected) if expected else 0}, "
            f"provided length={len(provided) if provided else 0}, "
            f"expected starts with={expected[:10] if expected else 'N/A'}, "
            f"provided starts with={provided[:10] if provided else 'N/A'}"
        )
        # Also log all headers for debugging
        logger.debug(f"Request headers: {dict(request.headers) if hasattr(request, 'headers') else 'N/A'}")
        logger.debug(f"Request META keys containing 'ADMIN' or 'KEY': {[k for k in request.META.keys() if 'ADMIN' in k.upper() or 'KEY' in k.upper()]}")
    else:
        logger.info(f"Admin auth successful for {request.path}")

    return provided == expected


def _unauthorized():
    return Response({"detail": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(["POST"])
def recommend(request):
    """
    POST /api/recommend/
    Body: Questionnaire JSON
    Response: { profile_text, results: [...] }
    Returns full perfume data with images, not just IDs.
    """
    serializer = QuestionnaireSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    engine = get_engine()
    result = engine.recommend(serializer.validated_data)

    # Limit to top 20 results
    top_results = result.get("results", [])[:20]

    # Get full perfume data for the results
    candidate_ids = [r.get("id") for r in top_results]
    perfumes = Perfume.objects.filter(id__in=candidate_ids)
    perfume_map = {p.id: p for p in perfumes}

    # Replace results with full perfume data
    full_results = []
    for r in top_results:
        perfume = perfume_map.get(r.get("id"))
        if perfume:
            serializer = PerfumeSerializer(perfume)
            full_results.append({
                "id": perfume.id,
                "score": r.get("score", 0),
                **serializer.data
            })
        else:
            # Fallback to original if perfume not found
            full_results.append(r)

    result["results"] = full_results
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

    return f"""You are a perfume recommendation expert. Analyze user preferences and match them with perfumes.

Task: Return JSON with rankings array. Each ranking must have:
- "id": perfume ID number
- "matchPercentage": 0-100 score
- "reasons": array of 1-2 SHORT phrases (max 5 words each) explaining the match in PERSIAN (Farsi)

IMPORTANT:
- All reasons must be in PERSIAN (Farsi) language
- Keep reasons concise. Examples: "مطابق با نت‌های مورد علاقه", "مناسب برای شب", "مطابق با شدت مورد نظر"
- Return ONLY valid JSON

userPreferences: {json.dumps(user_prefs, ensure_ascii=False)}

perfumes:
{perfume_lines}

Return ONLY valid JSON: {{"rankings": [{{"id": number, "matchPercentage": 0-100, "reasons": [string]}}]}}"""


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
    timeout_ms = int(request.GET.get("timeout", 90000))  # Default 90s to test if OpenAI can respond
    timeout_ms = min(timeout_ms, 120000)  # Cap at 120s max

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

    if not OPENAI_AVAILABLE:
        logger.warning("OpenAI library not available - using baseline")
        rankings = [
            {
                "id": item.get("id"),
                "matchPercentage": _safe_score_to_percentage(item.get("score")),
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

    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set - using baseline")
        rankings = [
            {
                "id": item.get("id"),
                "matchPercentage": _safe_score_to_percentage(item.get("score")),
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
        api_key = settings.OPENAI_API_KEY
        model = getattr(settings, "AI_MODEL", "gpt-5-mini")

        logger.info(f"Calling OpenAI with model: {model}, timeout: {timeout_ms}ms ({timeout_ms/1000.0:.1f}s)")
        logger.info(f"API key present: {bool(api_key)}, length: {len(api_key) if api_key else 0}")

        # Initialize OpenAI client with timeout and reduced retries
        # Use granular timeout: connect quickly, but allow longer read time
        # Set max_retries=0 to disable automatic retries - fail fast and fallback to baseline immediately
        timeout_seconds = timeout_ms / 1000.0
        read_timeout = max(10.0, timeout_seconds - 10.0)  # Ensure at least 10 seconds for read, reserve 10s for connect/write
        logger.info(f"Timeout breakdown: connect=10s, read={read_timeout:.1f}s, write=5s")

        client = OpenAI(
            api_key=api_key,
            timeout=httpx.Timeout(
                connect=10.0,  # 10 seconds to establish connection
                read=read_timeout,  # Remaining time for reading response
                write=5.0,  # 5 seconds to write request
                pool=30.0,  # 30 seconds for connection pool
            ),
            max_retries=0,  # Disable retries to avoid wasting tokens on retries
        )
        prompt = _build_rerank_prompt(answers, compact_perfumes)
        prompt_tokens_estimate = len(prompt.split()) * 1.3  # Rough estimate: ~1.3 tokens per word
        logger.info(f"Prompt length: {len(prompt)} chars, {len(compact_perfumes)} perfumes, ~{int(prompt_tokens_estimate)} tokens (estimate)")

        # Build parameters - some models don't support temperature
        create_params = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a perfume recommendation expert. Analyze user preferences and match them with perfumes. Return ONLY valid JSON. All reasons must be in PERSIAN (Farsi) language. Keep reasons SHORT (1-2 phrases, max 5 words each).",
                },
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
        }

        # Only add temperature for models that support it
        # GPT-5 series (gpt-5, gpt-5-mini, gpt-5-nano) only support default temperature (1)
        # o1 models also don't support custom temperature
        if not model.startswith("o1") and not model.startswith("gpt-5"):
            create_params["temperature"] = 0.2

        # Make direct API call - OpenAI client handles timeout internally
        api_call_start = time.time()
        try:
            logger.info("Sending request to OpenAI API...")
            ai_response = client.chat.completions.create(**create_params)
            api_call_duration = time.time() - api_call_start
            logger.info(f"OpenAI API responded successfully in {api_call_duration:.2f}s")

            # Log token usage if available
            if hasattr(ai_response, 'usage'):
                usage = ai_response.usage
                logger.info(f"Token usage - Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens}")
        except APITimeoutError as e:
            api_call_duration = time.time() - api_call_start
            logger.warning(f"OpenAI call exceeded {timeout_ms}ms timeout after {api_call_duration:.2f}s: {e}")
            logger.warning("This request likely consumed tokens but timed out before receiving response")
            raise TimeoutError(f"OpenAI call exceeded {timeout_ms}ms")
        except (APIError, BadRequestError) as e:
            api_call_duration = time.time() - api_call_start
            error_type = type(e).__name__
            error_msg = str(e)
            logger.error(f"OpenAI API call failed after {api_call_duration:.2f}s ({error_type}): {error_msg}")
            raise
        except Exception as e:
            api_call_duration = time.time() - api_call_start
            error_type = type(e).__name__
            error_msg = str(e)
            logger.error(f"Unexpected error during OpenAI call after {api_call_duration:.2f}s ({error_type}): {error_msg}")
            raise

        # Extract content from response
        content = None
        if hasattr(ai_response, "choices") and ai_response.choices:
            choice = ai_response.choices[0]
            if hasattr(choice, "message") and hasattr(choice.message, "content"):
                content = choice.message.content

        if not content:
            logger.error(f"No content in OpenAI response. Response structure: {type(ai_response)}, has choices: {hasattr(ai_response, 'choices')}")
            if hasattr(ai_response, "choices") and ai_response.choices:
                logger.error(f"First choice type: {type(ai_response.choices[0])}, has message: {hasattr(ai_response.choices[0], 'message')}")
                if hasattr(ai_response.choices[0], "message"):
                    logger.error(f"Message type: {type(ai_response.choices[0].message)}, has content: {hasattr(ai_response.choices[0].message, 'content')}")
            raise ValueError("No content in OpenAI response")

        logger.debug(f"OpenAI response length: {len(content)} chars")
        parsed = json.loads(content)
        ai_rankings = parsed.get("rankings", [])

        if not ai_rankings:
            logger.error(f"Empty rankings from OpenAI. Parsed keys: {list(parsed.keys())}")
            raise ValueError("Empty rankings from OpenAI")

        logger.info(f"OpenAI returned {len(ai_rankings)} rankings")

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
                    "matchPercentage": _safe_score_to_percentage(item.get("score")),
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

    except (TimeoutError, APITimeoutError, ValueError, KeyError, json.JSONDecodeError, APIError, BadRequestError, Exception) as e:
        # Fallback to baseline on any error
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"OpenAI rerank failed ({error_type}): {error_msg}", exc_info=True)

        rankings = [
            {
                "id": item.get("id"),
                "matchPercentage": _safe_score_to_percentage(item.get("score")),
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
                "error": f"{error_type}: {error_msg}" if settings.DEBUG else None,
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
            # Log what we're saving, especially images
            if "images" in request.data:
                logger.info(f"Updating perfume {pk} with images: {request.data.get('images')}")
            serializer.save()
            # Log what was actually saved
            saved_perfume = Perfume.objects.get(pk=pk)
            logger.info(f"Perfume {pk} images after save: {saved_perfume.images}")
            return Response(serializer.data)
        # Log validation errors for debugging
        logger.error(f"Perfume update validation failed for ID {pk}: {serializer.errors}")
        logger.error(f"Request data: {request.data}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    perfume.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def available_notes(request: HttpRequest):
    """
    GET /api/available-notes/
    Returns the master list of predefined notes for admin panel.
    Query params:
    - ?category=true: Returns notes organized by category
    """
    if request.GET.get("category") == "true":
        return Response(get_notes_by_category())
    return Response({"notes": get_all_notes()})


@api_view(["GET", "POST"])
def admin_brands(request: HttpRequest):
    """GET/POST /api/admin/brands/ - List all brands or create a new brand."""
    if not _is_admin(request):
        return _unauthorized()

    if request.method == "GET":
        queryset = Brand.objects.all().order_by("name")
        serializer = BrandSerializer(queryset, many=True)
        return Response(serializer.data)

    # POST - Create new brand
    serializer = BrandSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
def admin_brand_detail(request: HttpRequest, pk: int):
    """GET/PUT/PATCH/DELETE /api/admin/brands/<id>/ - Brand detail operations."""
    if not _is_admin(request):
        return _unauthorized()

    brand = get_object_or_404(Brand, pk=pk)

    if request.method == "GET":
        serializer = BrandSerializer(brand)
        return Response(serializer.data)

    if request.method in ["PUT", "PATCH"]:
        serializer = BrandSerializer(
            brand, data=request.data, partial=request.method == "PATCH"
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    brand.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
def admin_collections(request: HttpRequest):
    """GET/POST /api/admin/collections/ - List all collections or create a new collection."""
    if not _is_admin(request):
        return _unauthorized()

    if request.method == "GET":
        queryset = Collection.objects.select_related("brand").all().order_by("brand__name", "name")
        serializer = CollectionSerializer(queryset, many=True)
        return Response(serializer.data)

    # POST - Create new collection
    serializer = CollectionSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
def admin_collection_detail(request: HttpRequest, pk: int):
    """GET/PUT/PATCH/DELETE /api/admin/collections/<id>/ - Collection detail operations."""
    if not _is_admin(request):
        return _unauthorized()

    collection = get_object_or_404(Collection, pk=pk)

    if request.method == "GET":
        serializer = CollectionSerializer(collection)
        return Response(serializer.data)

    if request.method in ["PUT", "PATCH"]:
        serializer = CollectionSerializer(
            collection, data=request.data, partial=request.method == "PATCH"
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    collection.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
def admin_upload(request: HttpRequest):
    """
    POST /api/admin/upload/
    Upload an image file. Returns the URL to access the uploaded file.
    Requires admin authentication.
    """
    if not _is_admin(request):
        return _unauthorized()

    if "file" not in request.FILES:
        return Response(
            {"error": "فایل ارسال نشده است."},
            status=status.HTTP_400_BAD_REQUEST
        )

    file = request.FILES["file"]

    # Validate file type
    if not file.content_type.startswith("image/"):
        return Response(
            {"error": "فقط فایل‌های تصویری مجاز است."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate file size (10MB max)
    max_size = 10 * 1024 * 1024  # 10MB
    if file.size > max_size:
        return Response(
            {"error": "حجم فایل بیش از حد مجاز است (حداکثر 10 مگابایت)."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Save file to media directory
    import os
    import uuid
    from pathlib import Path
    from django.conf import settings

    try:
        # Ensure MEDIA_ROOT exists
        if not hasattr(settings, 'MEDIA_ROOT') or not settings.MEDIA_ROOT:
            logger.error("MEDIA_ROOT not configured in settings")
            return Response(
                {"error": "تنظیمات سرور ناقص است."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join(settings.MEDIA_ROOT, "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        logger.info(f"Upload directory: {upload_dir}")

        # Generate unique filename
        file_ext = Path(file.name).suffix or ".webp"
        unique_name = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(upload_dir, unique_name)

        # Save file directly
        logger.info(f"Saving file to: {file_path}")
        with open(file_path, "wb+") as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        # Verify file was saved
        if not os.path.exists(file_path):
            logger.error(f"File was not saved: {file_path}")
            return Response(
                {"error": "ذخیره فایل با خطا مواجه شد."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        file_size = os.path.getsize(file_path)
        logger.info(f"File saved successfully: {file_path} ({file_size} bytes)")

        # Return URL (absolute in production, relative in development)
        from matcher_backend.settings import get_media_url
        file_url = get_media_url(f"uploads/{unique_name}")
        logger.info(f"File uploaded successfully: {file_url} -> {file_path}")
        return Response(
            {"id": 0, "url": file_url},
            status=status.HTTP_201_CREATED
        )
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}", exc_info=True)
        return Response(
            {"error": f"خطا در آپلود فایل: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
