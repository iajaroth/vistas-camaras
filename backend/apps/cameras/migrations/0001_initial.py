import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="CameraGroup",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "code",
                    models.CharField(
                        max_length=6,
                        unique=True,
                        validators=[
                            django.core.validators.RegexValidator(
                                "^[A-Z]{2,4}\\d{2}$",
                                "Formato: 2-4 letras mayúsculas + 2 dígitos",
                            )
                        ],
                    ),
                ),
                ("name", models.CharField(max_length=100)),
                (
                    "description",
                    models.TextField(blank=True, default="", max_length=500),
                ),
                ("next_sequence", models.PositiveIntegerField(default=1)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["code"],
            },
        ),
        migrations.CreateModel(
            name="Camera",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("compound_code", models.CharField(max_length=9, unique=True)),
                ("name", models.CharField(max_length=100)),
                (
                    "description",
                    models.TextField(blank=True, default="", max_length=500),
                ),
                (
                    "day_view_path",
                    models.CharField(blank=True, default="", max_length=255),
                ),
                (
                    "day_thumbnail_path",
                    models.CharField(blank=True, default="", max_length=255),
                ),
                (
                    "night_view_path",
                    models.CharField(blank=True, default="", max_length=255),
                ),
                (
                    "night_thumbnail_path",
                    models.CharField(blank=True, default="", max_length=255),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "group",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="cameras",
                        to="cameras.cameragroup",
                    ),
                ),
            ],
            options={
                "ordering": ["compound_code"],
            },
        ),
        migrations.AddConstraint(
            model_name="camera",
            constraint=models.UniqueConstraint(
                fields=("group", "compound_code"),
                name="unique_compound_code_per_group",
            ),
        ),
    ]
