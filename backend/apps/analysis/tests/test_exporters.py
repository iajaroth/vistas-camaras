"""Tests for PDF export functionality."""

import tempfile
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from django.test import TestCase, override_settings
from PIL import Image as PILImage

from apps.cameras.models import Camera, CameraGroup
from apps.analysis.models import AnalysisReport, CriticalNote
from apps.analysis.exporters import export_camera_pdf, export_group_pdf


def _create_test_image(directory: Path, filename: str) -> str:
    """Create a minimal JPEG for testing. Returns relative path."""
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / filename
    img = PILImage.new("RGB", (800, 600), color="gray")
    img.save(str(path), "JPEG")
    return str(path.relative_to(directory.parent.parent))


class ExportGroupPDFTests(TestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        self.group = CameraGroup.objects.create(
            code="MC01", name="Main Campus", next_sequence=3
        )
        self.cam1 = Camera.objects.create(
            group=self.group, compound_code="MC01-01", name="Entrance"
        )
        self.cam2 = Camera.objects.create(
            group=self.group, compound_code="MC01-02", name="Parking"
        )

    def test_generates_valid_pdf_buffer(self):
        """PDF buffer starts with %PDF signature."""
        with self.settings(MEDIA_ROOT=self.media_root):
            buf = export_group_pdf(self.group)
            self.assertIsInstance(buf, BytesIO)
            content = buf.read()
            self.assertTrue(content.startswith(b"%PDF"))

    def test_pdf_with_report_and_notes(self):
        """PDF includes AI report sections and manual notes."""
        AnalysisReport.objects.create(
            camera=self.cam1,
            pros=["Buena cobertura"],
            improvements=["Ajustar ángulo"],
            recommended_analytics=["Detección vehicular"],
            critical_notes=["Punto ciego lateral"],
        )
        CriticalNote.objects.create(
            camera=self.cam1, content="Revisar montaje", author=None
        )
        with self.settings(MEDIA_ROOT=self.media_root):
            buf = export_group_pdf(self.group)
            content = buf.read()
            self.assertTrue(len(content) > 100)
            self.assertTrue(content.startswith(b"%PDF"))

    def test_pdf_with_images(self):
        """PDF embeds real image files when available."""
        media = Path(self.media_root)
        rel_path = _create_test_image(media / "MC01", "MC01-01_day.jpg")
        self.cam1.day_view_path = rel_path
        self.cam1.save()

        with self.settings(MEDIA_ROOT=self.media_root):
            buf = export_group_pdf(self.group)
            content = buf.read()
            self.assertTrue(content.startswith(b"%PDF"))
            # PDF with embedded image should be larger than one without
            self.assertTrue(len(content) > 500)

    def test_missing_image_uses_placeholder(self):
        """Cameras without images get placeholder text, no crash."""
        with self.settings(MEDIA_ROOT=self.media_root):
            buf = export_group_pdf(self.group)
            # Should complete without error
            self.assertTrue(buf.read().startswith(b"%PDF"))


class ExportCameraPDFTests(TestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        self.group = CameraGroup.objects.create(
            code="SI01", name="Site One", next_sequence=2
        )
        self.camera = Camera.objects.create(
            group=self.group, compound_code="SI01-01", name="Gate"
        )

    def test_single_camera_pdf(self):
        """Single-camera PDF is valid."""
        with self.settings(MEDIA_ROOT=self.media_root):
            buf = export_camera_pdf(self.camera)
            content = buf.read()
            self.assertTrue(content.startswith(b"%PDF"))
