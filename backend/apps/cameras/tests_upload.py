"""Tests for image upload and delete endpoints (task 5.2)."""

import shutil
import tempfile
from io import BytesIO
from pathlib import Path

from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from apps.cameras.models import Camera, CameraGroup

TEMP_MEDIA = tempfile.mkdtemp()


def _make_image(width=800, height=600, fmt="JPEG") -> BytesIO:
    """Create a valid in-memory image file."""
    buf = BytesIO()
    img = Image.new("RGB", (width, height), color="red")
    img.save(buf, format=fmt)
    buf.seek(0)
    buf.name = f"test.{fmt.lower()}"
    return buf


@override_settings(MEDIA_ROOT=TEMP_MEDIA, MEDIA_URL="/media/")
class UploadEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.create_user(username="op", password="pass")
        self.client.force_authenticate(user=user)

        self.group = CameraGroup.objects.create(
            code="MC01", name="Main Campus", next_sequence=2
        )
        self.camera = Camera.objects.create(
            group=self.group,
            compound_code="MC01-01",
            name="Entrance",
        )

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)
        super().tearDownClass()

    def test_upload_day_image_returns_201(self):
        img = _make_image()
        resp = self.client.post(
            f"/api/cameras/{self.camera.pk}/upload/?type=day",
            {"image": img},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["view_type"], "day")
        self.assertIn("/media/MC01/MC01-01_day", data["original_url"])
        self.assertIn("/media/MC01/MC01-01_day_thumb", data["thumbnail_url"])

    def test_upload_night_image_returns_201(self):
        img = _make_image()
        resp = self.client.post(
            f"/api/cameras/{self.camera.pk}/upload/?type=night",
            {"image": img},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["view_type"], "night")

    def test_upload_missing_type_returns_400(self):
        img = _make_image()
        resp = self.client.post(
            f"/api/cameras/{self.camera.pk}/upload/",
            {"image": img},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("type", resp.json()["errors"][0]["field"])

    def test_upload_invalid_type_returns_400(self):
        img = _make_image()
        resp = self.client.post(
            f"/api/cameras/{self.camera.pk}/upload/?type=invalid",
            {"image": img},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)

    def test_upload_missing_image_returns_400(self):
        resp = self.client.post(
            f"/api/cameras/{self.camera.pk}/upload/?type=day",
            {},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("image", resp.json()["errors"][0]["field"])

    def test_upload_too_small_resolution_returns_400(self):
        img = _make_image(width=320, height=240)
        resp = self.client.post(
            f"/api/cameras/{self.camera.pk}/upload/?type=day",
            {"image": img},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)

    def test_upload_replaces_previous_image(self):
        img1 = _make_image()
        self.client.post(
            f"/api/cameras/{self.camera.pk}/upload/?type=day",
            {"image": img1},
            format="multipart",
        )
        img2 = _make_image(width=1024, height=768)
        resp = self.client.post(
            f"/api/cameras/{self.camera.pk}/upload/?type=day",
            {"image": img2},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 201)
        # Verify DB was updated
        self.camera.refresh_from_db()
        self.assertTrue(self.camera.day_view_path)


@override_settings(MEDIA_ROOT=TEMP_MEDIA, MEDIA_URL="/media/")
class DeleteImageEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.create_user(username="op2", password="pass")
        self.client.force_authenticate(user=user)

        self.group = CameraGroup.objects.create(
            code="SI01", name="Site 1", next_sequence=2
        )
        self.camera = Camera.objects.create(
            group=self.group,
            compound_code="SI01-01",
            name="Gate",
        )

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)
        super().tearDownClass()

    def test_delete_image_returns_204(self):
        # Upload first
        img = _make_image()
        self.client.post(
            f"/api/cameras/{self.camera.pk}/upload/?type=day",
            {"image": img},
            format="multipart",
        )
        # Delete
        resp = self.client.delete(f"/api/cameras/{self.camera.pk}/image/day/")
        self.assertEqual(resp.status_code, 204)
        # Verify DB cleared
        self.camera.refresh_from_db()
        self.assertEqual(self.camera.day_view_path, "")
        self.assertEqual(self.camera.day_thumbnail_path, "")

    def test_delete_nonexistent_image_still_204(self):
        # Delete without prior upload — should be idempotent
        resp = self.client.delete(f"/api/cameras/{self.camera.pk}/image/night/")
        self.assertEqual(resp.status_code, 204)
