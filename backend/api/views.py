from pathlib import Path
import json

from django.conf import settings
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Perfume
from .serializers import QuestionnaireSerializer, PerfumeSerializer
from matcher.vectorizer import get_engine


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


@api_view(["GET"])
def perfumes(request):
    """
    GET /api/perfumes/
    Returns the catalog used by the matcher.
    """
    path: Path = settings.BASE_DIR / "perfumes.json"
    if not path.exists():
        return Response(
            {"detail": "perfumes.json not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    data = json.loads(path.read_text(encoding="utf-8"))
    return Response(data)


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
