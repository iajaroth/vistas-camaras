"""Unit tests for cameras.services.create_camera_in_group."""

import pytest
from django.test import TestCase

from apps.cameras.models import Camera, CameraGroup
from apps.cameras.services import create_camera_in_group


class CreateCameraInGroupTests(TestCase):
    def setUp(self):
        self.group = CameraGroup.objects.create(
            code="MC01", name="Main Campus", next_sequence=1
        )

    def test_creates_camera_with_correct_compound_code(self):
        camera = create_camera_in_group(self.group, name="Entrance")
        assert camera.compound_code == "MC01-01"
        assert camera.name == "Entrance"

    def test_increments_next_sequence(self):
        create_camera_in_group(self.group, name="Cam 1")
        self.group.refresh_from_db()
        assert self.group.next_sequence == 2

    def test_sequential_codes_never_reuse(self):
        c1 = create_camera_in_group(self.group, name="Cam 1")
        c2 = create_camera_in_group(self.group, name="Cam 2")
        c1.delete()
        c3 = create_camera_in_group(self.group, name="Cam 3")
        # Sequence keeps advancing, no reuse of 01
        assert c2.compound_code == "MC01-02"
        assert c3.compound_code == "MC01-03"

    def test_raises_when_group_at_capacity(self):
        self.group.next_sequence = 100
        self.group.save()
        with pytest.raises(ValueError, match="capacidad máxima"):
            create_camera_in_group(self.group, name="Overflow")

    def test_description_defaults_to_empty(self):
        camera = create_camera_in_group(self.group, name="No desc")
        assert camera.description == ""

    def test_description_persists(self):
        camera = create_camera_in_group(
            self.group, name="Parking", description="Estacionamiento norte"
        )
        assert camera.description == "Estacionamiento norte"
