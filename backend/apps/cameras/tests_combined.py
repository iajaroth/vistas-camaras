"""Minimal test for the combined view endpoint."""

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.cameras.models import Camera, CameraGroup


@override_settings(MEDIA_URL="/media/")
class CombinedViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # ponytail: skip auth for unit test — force_authenticate
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.create_user(username="op", password="pass")
        self.client.force_authenticate(user=user)

        self.group = CameraGroup.objects.create(
            code="MC01", name="Main Campus", next_sequence=3
        )
        self.cam1 = Camera.objects.create(
            group=self.group,
            compound_code="MC01-01",
            name="Entrance",
            day_view_path="MC01/MC01-01_day.jpg",
            day_thumbnail_path="MC01/MC01-01_day_thumb.jpg",
            night_view_path="",
            night_thumbnail_path="",
        )
        self.cam2 = Camera.objects.create(
            group=self.group,
            compound_code="MC01-02",
            name="Parking",
            day_view_path="",
            day_thumbnail_path="",
            night_view_path="MC01/MC01-02_night.jpg",
            night_thumbnail_path="MC01/MC01-02_night_thumb.jpg",
        )

    def test_combined_returns_cameras_with_urls(self):
        resp = self.client.get(f"/api/groups/{self.group.pk}/combined/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["group_code"], "MC01")
        self.assertEqual(data["group_name"], "Main Campus")
        self.assertEqual(len(data["cameras"]), 2)

        cam1 = data["cameras"][0]
        self.assertEqual(cam1["compound_code"], "MC01-01")
        self.assertEqual(cam1["day_view_url"], "/media/MC01/MC01-01_day.jpg")
        self.assertEqual(cam1["day_thumbnail_url"], "/media/MC01/MC01-01_day_thumb.jpg")
        self.assertIsNone(cam1["night_view_url"])
        self.assertIsNone(cam1["night_thumbnail_url"])

        cam2 = data["cameras"][1]
        self.assertEqual(cam2["compound_code"], "MC01-02")
        self.assertIsNone(cam2["day_view_url"])
        self.assertEqual(cam2["night_view_url"], "/media/MC01/MC01-02_night.jpg")

    def test_combined_404_for_nonexistent_group(self):
        resp = self.client.get("/api/groups/9999/combined/")
        self.assertEqual(resp.status_code, 404)
