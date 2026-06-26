"""Unit tests for cameras.services.save_camera_image and delete_camera_image."""

import io
import shutil
import tempfile
from pathlib import Path

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from apps.cameras.models import Camera, CameraGroup
from apps.cameras.services import delete_camera_image, save_camera_image


def _make_image(width=800, height=600, fmt="JPEG") -> io.BytesIO:
    """Create an in-memory image file."""
    img = Image.new("RGB", (width, height), color="red")
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf


def _uploaded_file(width=800, height=600, fmt="JPEG", name="test.jpg", size_override=None):
    """Create a SimpleUploadedFile with a valid image."""
    buf = _make_image(width, height, fmt)
    content = buf.getvalue()
    f = SimpleUploadedFile(name, content, content_type=f"image/{fmt.lower()}")
    if size_override is not None:
        f.size = size_override
    return f


class SaveCameraImageTests(TestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        self.group = CameraGroup.objects.create(
            code="MC01", name="Main Campus", next_sequence=2
        )
        self.camera = Camera.objects.create(
            group=self.group, compound_code="MC01-01", name="Entrance"
        )

    def tearDown(self):
        shutil.rmtree(self.media_root, ignore_errors=True)

    @property
    def _media_path(self):
        return Path(self.media_root)

    def test_saves_jpeg_image_and_thumbnail(self):
        with self.settings(MEDIA_ROOT=self.media_root):
            f = _uploaded_file(800, 600, "JPEG", "photo.jpg")
            orig, thumb = save_camera_image(self.camera, f, "day")

            assert orig == "MC01/MC01-01_day.jpg"
            assert thumb == "MC01/MC01-01_day_thumb.jpg"

            # Files exist on disk
            assert (self._media_path / "MC01" / "MC01-01_day.jpg").exists()
            assert (self._media_path / "MC01" / "MC01-01_day_thumb.jpg").exists()

            # Thumbnail width <= 400
            thumb_img = Image.open(self._media_path / "MC01" / "MC01-01_day_thumb.jpg")
            assert thumb_img.size[0] <= 400

            # Model updated
            self.camera.refresh_from_db()
            assert self.camera.day_view_path == orig
            assert self.camera.day_thumbnail_path == thumb

    def test_saves_png_image(self):
        with self.settings(MEDIA_ROOT=self.media_root):
            f = _uploaded_file(640, 480, "PNG", "photo.png")
            orig, thumb = save_camera_image(self.camera, f, "night")

            assert orig == "MC01/MC01-01_night.png"
            assert thumb == "MC01/MC01-01_night_thumb.png"

            self.camera.refresh_from_db()
            assert self.camera.night_view_path == orig
            assert self.camera.night_thumbnail_path == thumb

    def test_rejects_file_over_10mb(self):
        f = _uploaded_file(800, 600, "JPEG", "big.jpg", size_override=11 * 1024 * 1024)
        with pytest.raises(ValueError, match="excede 10 MB"):
            save_camera_image(self.camera, f, "day")

    def test_rejects_unsupported_format(self):
        img = Image.new("RGB", (800, 600), color="blue")
        buf = io.BytesIO()
        img.save(buf, format="BMP")
        buf.seek(0)
        f = SimpleUploadedFile("test.bmp", buf.getvalue(), content_type="image/bmp")
        with pytest.raises(ValueError, match="Formato no soportado"):
            save_camera_image(self.camera, f, "day")

    def test_rejects_low_resolution(self):
        f = _uploaded_file(320, 240, "JPEG", "small.jpg")
        with pytest.raises(ValueError, match="Resolución mínima"):
            save_camera_image(self.camera, f, "day")

    def test_rejects_invalid_view_type(self):
        f = _uploaded_file(800, 600, "JPEG", "photo.jpg")
        with pytest.raises(ValueError, match="view_type"):
            save_camera_image(self.camera, f, "evening")

    def test_replaces_existing_image(self):
        with self.settings(MEDIA_ROOT=self.media_root):
            f1 = _uploaded_file(800, 600, "JPEG", "first.jpg")
            orig1, _ = save_camera_image(self.camera, f1, "day")
            assert (self._media_path / "MC01" / "MC01-01_day.jpg").exists()

            f2 = _uploaded_file(1024, 768, "JPEG", "second.jpg")
            orig2, _ = save_camera_image(self.camera, f2, "day")

            # New file exists (same path since same format)
            assert (self._media_path / "MC01" / "MC01-01_day.jpg").exists()
            assert orig1 == orig2

    def test_thumbnail_preserves_aspect_ratio(self):
        with self.settings(MEDIA_ROOT=self.media_root):
            # 1600x900 image → thumb should be 400x225
            f = _uploaded_file(1600, 900, "JPEG", "wide.jpg")
            _, thumb = save_camera_image(self.camera, f, "day")
            thumb_img = Image.open(self._media_path / "MC01" / "MC01-01_day_thumb.jpg")
            assert thumb_img.size[0] == 400
            assert thumb_img.size[1] == 225

    def test_small_image_no_upscale(self):
        """640px wide image gets resized to 400px (ratio = 400/640 < 1)."""
        with self.settings(MEDIA_ROOT=self.media_root):
            f = _uploaded_file(640, 480, "JPEG", "min.jpg")
            _, thumb = save_camera_image(self.camera, f, "day")
            thumb_img = Image.open(self._media_path / "MC01" / "MC01-01_day_thumb.jpg")
            assert thumb_img.size[0] == 400
            assert thumb_img.size[1] == 300


class DeleteCameraImageTests(TestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        self.group = CameraGroup.objects.create(
            code="SI01", name="Site One", next_sequence=2
        )
        self.camera = Camera.objects.create(
            group=self.group, compound_code="SI01-01", name="Gate"
        )

    def tearDown(self):
        shutil.rmtree(self.media_root, ignore_errors=True)

    @property
    def _media_path(self):
        return Path(self.media_root)

    def test_deletes_files_and_clears_fields(self):
        with self.settings(MEDIA_ROOT=self.media_root):
            f = _uploaded_file(800, 600, "JPEG", "photo.jpg")
            orig, thumb = save_camera_image(self.camera, f, "day")
            assert (self._media_path / "SI01" / "SI01-01_day.jpg").exists()

            delete_camera_image(self.camera, "day")

            assert not (self._media_path / "SI01" / "SI01-01_day.jpg").exists()
            assert not (self._media_path / "SI01" / "SI01-01_day_thumb.jpg").exists()

            self.camera.refresh_from_db()
            assert self.camera.day_view_path == ""
            assert self.camera.day_thumbnail_path == ""

    def test_noop_when_no_image(self):
        """Should not raise when camera has no image for the view type."""
        delete_camera_image(self.camera, "night")
        self.camera.refresh_from_db()
        assert self.camera.night_view_path == ""

    def test_rejects_invalid_view_type(self):
        with pytest.raises(ValueError, match="view_type"):
            delete_camera_image(self.camera, "twilight")
