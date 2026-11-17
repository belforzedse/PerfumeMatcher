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
    Recommend real Gandom WooCommerce products.
    """
    serializer = QuestionnaireSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        engine = get_engine()
        result = engine.recommend(serializer.validated_data)
    except Exception:
        return Response(
            {"detail": "Perfume recommendation service unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    perfume_map = {
        perfume.id: perfume
        for perfume in engine.perfumes
    }

    full_results = []

    for recommendation in result.get("results", [])[:20]:
        perfume = perfume_map.get(recommendation.get("id"))

        if perfume is None:
            continue

        # Keep existing frontend-compatible perfume fields
        perfume_data = dict(PerfumeSerializer(perfume).data)

        images = getattr(perfume, "images", []) or []
        image_url = getattr(
            perfume,
            "wc_image",
            images[0] if images else ""
        )

        full_results.append({
            **perfume_data,
            **recommendation,

            "id": perfume.id,
            "woo_product_id": perfume.id,

            "name": perfume.name,
            "brand": perfume.brand,
            "family": perfume.family,
            "description": perfume.description,

            "notes_top": getattr(perfume, "notes_top", []),
            "notes_middle": perfume.notes_middle,
            "notes_base": perfume.notes_base,
            "all_notes": perfume.all_notes,

            "images": images,
            "image": image_url,

            "price": getattr(perfume, "wc_price", ""),
            "product_url": getattr(perfume, "wc_url", ""),
            "permalink": getattr(perfume, "wc_url", ""),

            "stock_status": "instock",
        })

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
        "gender": answers.get("gender"),
        "moods": answers.get("moods", [])[:6],
        "moments": answers.get("moments", [])[:6],
        "times": answers.get("times", [])[:3],
        "intensity": answers.get("intensity", [])[:3],
        "styles": answers.get("styles", [])[:4],
        "likedNotes": answers.get("noteLikes", [])[:6],
        "dislikedNotes": answers.get("noteDislikes", [])[:6],
        "scentTraits": answers.get("scentTraits", {}),
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
SCENT PREFERENCES:
- scentTraits contains preferences from 1 to 5.
- 1 means the user strongly dislikes that characteristic.
- 3 is neutral.
- 5 means the user strongly prefers it.
- Consider sweetness, freshness, warmth, bitterness, powdery
  and woody characteristics when ranking perfumes.
- Avoid perfumes containing explicitly disliked notes.
- Do not assume that a listed note proves its intensity.
- Prefer perfumes matching the user's preferences.
- Do not invent missing perfume characteristics.
FAVORITE PERFUMES:
- favoritePerfumes lists perfumes the user previously enjoyed.
- Match their known notes with the candidate perfumes.
- Give more weight to the likedFeatures selected for each perfume.
- Consider each favorite perfume separately.
- Respect explicitly disliked notes and scentTraits.
- Do not assume performance or longevity without reliable data.
- Do not invent missing fragrance notes.
userPreferences: {json.dumps(user_prefs, ensure_ascii=False)}

perfumes:
{perfume_lines}

Return ONLY valid JSON: {{"rankings": [{{"id": number, "matchPercentage": 0-100, "reasons": [string]}}]}}"""



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
