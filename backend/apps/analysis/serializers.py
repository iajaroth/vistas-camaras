from rest_framework import serializers

from .models import AnalysisReport, CriticalNote


class AnalysisReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisReport
        fields = [
            "id",
            "camera",
            "pros",
            "improvements",
            "recommended_analytics",
            "critical_notes",
            "analyzed_at",
        ]
        read_only_fields = fields


class CriticalNoteSerializer(serializers.ModelSerializer):
    author_username = serializers.SerializerMethodField()

    class Meta:
        model = CriticalNote
        fields = ["id", "camera", "author_username", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "camera", "created_at", "updated_at"]

    def get_author_username(self, obj) -> str | None:
        return obj.author.username if obj.author else None

    def validate_content(self, value):
        if len(value) > 2000:
            raise serializers.ValidationError("El contenido no puede exceder 2000 caracteres.")
        return value
