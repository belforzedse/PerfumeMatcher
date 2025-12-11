from django.urls import path
from .views import (
    recommend,
    recommend_rerank,
    perfumes,
    admin_perfumes,
    admin_perfume_detail,
    available_notes,
)

urlpatterns = [
    path("recommend/", recommend, name="recommend"),
    path("recommend/rerank/", recommend_rerank, name="recommend_rerank"),
    path("perfumes/", perfumes, name="perfumes"),
    path("admin/perfumes/", admin_perfumes, name="admin_perfumes"),
    path("admin/perfumes/<int:pk>/", admin_perfume_detail, name="admin_perfume_detail"),
    path("available-notes/", available_notes, name="available_notes"),
]
