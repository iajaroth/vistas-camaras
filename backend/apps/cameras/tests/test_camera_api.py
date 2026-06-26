"""Unit tests for Camera serializers and viewsets (task 4.4)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.cameras.models import Camera, CameraGroup
from apps.cameras.serializers import CameraCreateSerializer, CameraSerializer

User = get_user_model()


class CameraSerializerTests(TestCase):
    def setUp(self):
        self.group = CameraGroup.objects.create(code="TS01", name="Test Site")
        self.camera = Camera.objects.create(
            group=self.group,
            compound_code="TS01-01",
            name="Entrance",
            day_view_path="TS01/TS01-01_day.jpg",
        )

    def test_has_day_view_true(self):
        data = CameraSerializer(self.camera).data
        assert data["has_day_view"] is True

    def test_has_night_view_false(self):
        data = CameraSerializer(self.camera).data
        assert data["has_night_view"] is False

    def test_has_report_false_when_no_report(self):
        data = CameraSerializer(self.camera).data
        assert data["has_report"] is False

    def test_compound_code_is_readonly(self):
        ser = CameraSerializer(self.camera, data={"compound_code": "XX01-99"}, partial=True)
        ser.is_valid()
        ser.save()
        self.camera.refresh_from_db()
        assert self.camera.compound_code == "TS01-01"

    def test_create_serializer_validates_name_max_length(self):
        ser = CameraCreateSerializer(data={"name": "x" * 101})
        assert not ser.is_valid()
        assert "name" in ser.errors


class CameraNestedViewSetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="op", password="pass")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.group = CameraGroup.objects.create(code="NV01", name="Nested View")

    def test_create_camera_returns_201(self):
        resp = self.client.post(
            f"/api/groups/{self.group.pk}/cameras/",
            {"name": "Lobby"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["compound_code"] == "NV01-01"

    def test_list_cameras_for_group(self):
        Camera.objects.create(group=self.group, compound_code="NV01-01", name="C1")
        Camera.objects.create(group=self.group, compound_code="NV01-02", name="C2")
        resp = self.client.get(f"/api/groups/{self.group.pk}/cameras/")
        assert resp.status_code == 200
        # paginated response
        assert resp.data["count"] == 2

    def test_create_camera_at_capacity(self):
        self.group.next_sequence = 100
        self.group.save()
        resp = self.client.post(
            f"/api/groups/{self.group.pk}/cameras/",
            {"name": "Overflow"},
            format="json",
        )
        assert resp.status_code == 400
        assert "capacidad máxima" in resp.data["errors"][0]["message"]


class CameraDetailViewSetTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="op", password="pass")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.group = CameraGroup.objects.create(code="DT01", name="Detail")
        self.camera = Camera.objects.create(
            group=self.group, compound_code="DT01-01", name="Gate"
        )

    def test_retrieve_camera(self):
        resp = self.client.get(f"/api/cameras/{self.camera.pk}/")
        assert resp.status_code == 200
        assert resp.data["compound_code"] == "DT01-01"

    def test_patch_camera_name(self):
        resp = self.client.patch(
            f"/api/cameras/{self.camera.pk}/",
            {"name": "Main Gate"},
            format="json",
        )
        assert resp.status_code == 200
        self.camera.refresh_from_db()
        assert self.camera.name == "Main Gate"

    def test_delete_camera(self):
        resp = self.client.delete(f"/api/cameras/{self.camera.pk}/")
        assert resp.status_code == 204
        assert not Camera.objects.filter(pk=self.camera.pk).exists()
