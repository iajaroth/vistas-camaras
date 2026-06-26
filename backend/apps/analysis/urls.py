from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CameraAnalyzeView,
    CameraExportPDFView,
    CameraNoteViewSet,
    CameraReportView,
    GroupExportPDFView,
    NoteDetailViewSet,
)

# /api/notes/{pk}/ for PATCH and DELETE
note_router = DefaultRouter()
note_router.register("notes", NoteDetailViewSet, basename="note")

# /api/cameras/{camera_pk}/notes/ for GET and POST
nested_note_router = DefaultRouter()
nested_note_router.register("notes", CameraNoteViewSet, basename="camera-notes")

urlpatterns = [
    path("", include(note_router.urls)),
    path("cameras/<int:camera_pk>/", include(nested_note_router.urls)),
    path("cameras/<int:camera_pk>/analyze/", CameraAnalyzeView.as_view(), name="camera-analyze"),
    path("cameras/<int:camera_pk>/report/", CameraReportView.as_view(), name="camera-report"),
    path("cameras/<int:camera_pk>/export/pdf/", CameraExportPDFView.as_view(), name="camera-export-pdf"),
    path("groups/<int:group_pk>/export/pdf/", GroupExportPDFView.as_view(), name="group-export-pdf"),
]
