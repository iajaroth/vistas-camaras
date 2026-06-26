from django.conf import settings
from django.db import models


class AnalysisReport(models.Model):
    camera = models.OneToOneField(
        "cameras.Camera", on_delete=models.CASCADE, related_name="report"
    )
    pros = models.JSONField(default=list)
    improvements = models.JSONField(default=list)
    recommended_analytics = models.JSONField(default=list)
    critical_notes = models.JSONField(default=list)
    analyzed_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Report: {self.camera.compound_code}"


class CriticalNote(models.Model):
    camera = models.ForeignKey(
        "cameras.Camera", on_delete=models.CASCADE, related_name="notes"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    content = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note: {self.camera.compound_code} ({self.created_at:%Y-%m-%d})"
