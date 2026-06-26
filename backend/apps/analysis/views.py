from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cameras.models import Camera, CameraGroup

from .ai_client import analyze_with_fallback
from .models import AnalysisReport, CriticalNote
from .serializers import AnalysisReportSerializer, CriticalNoteSerializer


class CameraNoteViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    """GET/POST /api/cameras/{camera_pk}/notes/"""

    serializer_class = CriticalNoteSerializer

    def get_queryset(self):
        return CriticalNote.objects.filter(camera_id=self.kwargs["camera_pk"])

    def create(self, request, *args, **kwargs):
        camera = get_object_or_404(Camera, pk=self.kwargs["camera_pk"])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(camera=camera, author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class NoteDetailViewSet(
    mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    """PATCH/DELETE /api/notes/{pk}/"""

    queryset = CriticalNote.objects.all()
    serializer_class = CriticalNoteSerializer
    http_method_names = ["patch", "delete", "options", "head"]


class CameraAnalyzeView(APIView):
    """POST /api/cameras/{camera_pk}/analyze/ — Trigger AI analysis."""

    def post(self, request, camera_pk):
        camera = get_object_or_404(Camera, pk=camera_pk)

        # Validate camera has at least one image
        if not camera.day_view_path and not camera.night_view_path:
            return Response(
                {"detail": "La cámara no tiene imágenes para analizar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = analyze_with_fallback(camera)

        if result is None:
            # ponytail: API failed — preserve existing report, return 503
            return Response(
                {"detail": "Servicio de IA no disponible temporalmente."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        report, _created = AnalysisReport.objects.update_or_create(
            camera=camera,
            defaults={
                "pros": result["pros"],
                "improvements": result["improvements"],
                "recommended_analytics": result["recommended_analytics"],
                "critical_notes": result["critical_notes"],
            },
        )
        serializer = AnalysisReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CameraReportView(APIView):
    """GET /api/cameras/{camera_pk}/report/ — Retrieve existing report."""

    def get(self, request, camera_pk):
        camera = get_object_or_404(Camera, pk=camera_pk)
        try:
            report = camera.report
        except AnalysisReport.DoesNotExist:
            return Response(
                {"detail": "No existe reporte de análisis para esta cámara."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AnalysisReportSerializer(report)
        return Response(serializer.data)


class GroupExportPDFView(APIView):
    """GET /api/groups/{group_pk}/export/pdf/ — Download group PDF."""

    def get(self, request, group_pk):
        group = get_object_or_404(CameraGroup, pk=group_pk)
        try:
            from .exporters import export_group_pdf

            buffer = export_group_pdf(group)
        except Exception:
            return Response(
                {"detail": "Error al generar el PDF del grupo."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="grupo_{group.code}.pdf"'
        )
        return response


class CameraExportPDFView(APIView):
    """GET /api/cameras/{camera_pk}/export/pdf/ — Download camera PDF."""

    def get(self, request, camera_pk):
        camera = get_object_or_404(Camera, pk=camera_pk)
        try:
            from .exporters import export_camera_pdf

            buffer = export_camera_pdf(camera)
        except Exception:
            return Response(
                {"detail": "Error al generar el PDF de la cámara."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="camara_{camera.compound_code}.pdf"'
        )
        return response
