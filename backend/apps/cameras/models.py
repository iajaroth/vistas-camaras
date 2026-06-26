import re

from django.core.validators import RegexValidator
from django.db import models

CODE_PATTERN = re.compile(r"^[A-Z]{2,4}\d{2}$")


class CameraGroup(models.Model):
    code = models.CharField(
        max_length=6,
        unique=True,
        validators=[
            RegexValidator(
                r"^[A-Z]{2,4}\d{2}$",
                "Formato: 2-4 letras mayúsculas + 2 dígitos",
            )
        ],
    )
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=500, blank=True, default="")
    next_sequence = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Camera(models.Model):
    group = models.ForeignKey(
        CameraGroup, on_delete=models.CASCADE, related_name="cameras"
    )
    compound_code = models.CharField(max_length=9, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=500, blank=True, default="")
    day_view_path = models.CharField(max_length=255, blank=True, default="")
    day_thumbnail_path = models.CharField(max_length=255, blank=True, default="")
    night_view_path = models.CharField(max_length=255, blank=True, default="")
    night_thumbnail_path = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["compound_code"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "compound_code"],
                name="unique_compound_code_per_group",
            )
        ]

    def __str__(self):
        return self.compound_code
