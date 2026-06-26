import os

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.analysis.exporters import export_camera_excel, export_group_excel

from .models import Camera, CameraGroup
from .serializers import (
    CameraCreateSerializer,
    CameraGroupSerializer,
    CameraGroupUpdateSerializer,
    CameraSerializer,
)
from .services import create_camera_in_group, delete_camera_image, save_camera_image


class CameraGroupViewSet(viewsets.ModelViewSet):
    queryset = CameraGroup.objects.all()

    def get_serializer_class(self):
        if self.action in ("partial_update", "update"):
            return CameraGroupUpdateSerializer
        return CameraGroupSerializer

    def perform_destroy(self, instance):
        # ponytail: delete image files from disk before cascade removes DB rows
        for camera in instance.cameras.all():
            _delete_camera_files(camera)
        instance.delete()

    @action(detail=True, methods=["get"], url_path="export/excel")
    def export_excel(self, request, pk=None):
        """GET /api/groups/{id}/export/excel/ — download group as XLSX."""
        group = self.get_object()
        buffer = export_group_excel(group)
        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{group.code}.xlsx"'
        return response


class CameraNestedViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    """Nested under /groups/{group_pk}/cameras/ — list and create."""

    def get_queryset(self):
        return Camera.objects.filter(group_id=self.kwargs["group_pk"])

    def get_serializer_class(self):
        if self.action == "create":
            return CameraCreateSerializer
        return CameraSerializer

    def create(self, request, *args, **kwargs):
        serializer = CameraCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = get_object_or_404(CameraGroup, pk=self.kwargs["group_pk"])
        try:
            camera = create_camera_in_group(
                group=group,
                name=serializer.validated_data["name"],
                description=serializer.validated_data.get("description", ""),
            )
        except ValueError as exc:
            return Response(
                {"errors": [{"field": "group", "message": str(exc)}]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            CameraSerializer(camera).data, status=status.HTTP_201_CREATED
        )


class CameraDetailViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Individual camera: /cameras/{pk}/ — GET, PATCH, DELETE."""

    queryset = Camera.objects.all()
    serializer_class = CameraSerializer

    def perform_destroy(self, instance):
        _delete_camera_files(instance)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="upload", parser_classes=[MultiPartParser])
    def upload(self, request, pk=None):
        """POST /api/cameras/{id}/upload/ — upload day or night image."""
        camera = self.get_object()
        view_type = request.query_params.get("type")

        if view_type not in ("day", "night"):
            return Response(
                {"errors": [{"field": "type", "message": "Query param 'type' debe ser 'day' o 'night'."}]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        image_file = request.FILES.get("image")
        if not image_file:
            return Response(
                {"errors": [{"field": "image", "message": "El campo 'image' es requerido."}]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            original_rel, thumb_rel = save_camera_image(camera, image_file, view_type)
        except ValueError as exc:
            return Response(
                {"errors": [{"field": "image", "message": str(exc)}]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "view_type": view_type,
                "original_url": f"{settings.MEDIA_URL}{original_rel}",
                "thumbnail_url": f"{settings.MEDIA_URL}{thumb_rel}",
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["delete"], url_path="image/(?P<view_type>day|night)")
    def delete_image(self, request, pk=None, view_type=None):
        """DELETE /api/cameras/{id}/image/{type}/ — remove specific image."""
        camera = self.get_object()
        delete_camera_image(camera, view_type)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="export/excel")
    def export_excel(self, request, pk=None):
        """GET /api/cameras/{id}/export/excel/ — download single camera as XLSX."""
        camera = self.get_object()
        buffer = export_camera_excel(camera)
        response = HttpResponse(
            buffer.getvalue(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="{camera.compound_code}.xlsx"'
        )
        return response


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _delete_camera_files(camera: Camera) -> None:
    """Remove image files from disk for a camera."""
    for field in (
        "day_view_path",
        "day_thumbnail_path",
        "night_view_path",
        "night_thumbnail_path",
    ):
        rel_path = getattr(camera, field)
        if rel_path:
            full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
            if os.path.isfile(full_path):
                os.remove(full_path)
