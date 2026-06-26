from rest_framework import serializers

from .models import Camera, CameraGroup


class CameraGroupSerializer(serializers.ModelSerializer):
    camera_count = serializers.SerializerMethodField()

    class Meta:
        model = CameraGroup
        fields = ["id", "code", "name", "description", "camera_count", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_camera_count(self, obj):
        return obj.cameras.count()


class CameraGroupUpdateSerializer(serializers.ModelSerializer):
    """Serializer for PATCH — code is read-only on updates."""

    camera_count = serializers.SerializerMethodField()

    class Meta:
        model = CameraGroup
        fields = ["id", "code", "name", "description", "camera_count", "created_at", "updated_at"]
        read_only_fields = ["id", "code", "created_at", "updated_at"]

    def get_camera_count(self, obj):
        return obj.cameras.count()


# ---------------------------------------------------------------------------
# Camera serializers
# ---------------------------------------------------------------------------


class CameraSerializer(serializers.ModelSerializer):
    """Full representation of a Camera (read operations + PATCH)."""

    has_day_view = serializers.SerializerMethodField()
    has_night_view = serializers.SerializerMethodField()
    has_report = serializers.SerializerMethodField()

    class Meta:
        model = Camera
        fields = [
            "id",
            "compound_code",
            "group",
            "name",
            "description",
            "has_day_view",
            "has_night_view",
            "has_report",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "compound_code", "group", "created_at", "updated_at"]

    def get_has_day_view(self, obj) -> bool:
        return bool(obj.day_view_path)

    def get_has_night_view(self, obj) -> bool:
        return bool(obj.night_view_path)

    def get_has_report(self, obj) -> bool:
        return hasattr(obj, "report")


class CameraCreateSerializer(serializers.Serializer):
    """Accepts only name + description; compound_code is auto-generated."""

    name = serializers.CharField(max_length=100)
    description = serializers.CharField(
        max_length=500, required=False, default="", allow_blank=True
    )
