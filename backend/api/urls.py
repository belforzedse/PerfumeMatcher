from django.urls import path
from .views import (
    recommend,
    recommend_rerank,
    perfumes,
    admin_perfumes,
    admin_perfume_detail,
    admin_brands,
    admin_brand_detail,
    admin_collections,
    admin_collection_detail,
    available_notes,
    admin_upload,
)

urlpatterns = [
    path("recommend/", recommend, name="recommend"),
    path("recommend/rerank/", recommend_rerank, name="recommend_rerank"),
    path("perfumes/", perfumes, name="perfumes"),
    path("admin/perfumes/", admin_perfumes, name="admin_perfumes"),
    path("admin/perfumes/<int:pk>/", admin_perfume_detail, name="admin_perfume_detail"),
    path("admin/brands/", admin_brands, name="admin_brands"),
    path("admin/brands/<int:pk>/", admin_brand_detail, name="admin_brand_detail"),
    path("admin/collections/", admin_collections, name="admin_collections"),
    path("admin/collections/<int:pk>/", admin_collection_detail, name="admin_collection_detail"),
    path("admin/upload/", admin_upload, name="admin_upload"),
    path("available-notes/", available_notes, name="available_notes"),
]
