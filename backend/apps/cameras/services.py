from pathlib import Path

from django.conf import settings
from django.db import transaction
from PIL import Image

from .models import Camera, CameraGroup

MEDIA_ROOT = Path(settings.MEDIA_ROOT)
THUMBNAIL_MAX_WIDTH = 400
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MIN_RESOLUTION = (640, 480)


def _get_media_root() -> Path:
    """Return MEDIA_ROOT as Path — allows override_settings to work in tests."""
    return Path(settings.MEDIA_ROOT)


@transaction.atomic
def create_camera_in_group(
    group: CameraGroup, name: str, description: str = ""
) -> Camera:
    """Genera el siguiente código compuesto y crea la cámara.

    El código compuesto es {group.code}-{sequence:02d}. Las secuencias nunca se
    reutilizan: next_sequence solo avanza. select_for_update() previene race conditions.
    """
    # ponytail: select_for_update is the simplest row-level lock; upgrade to advisory
    # lock only if contention is measured on the same group row.
    group = CameraGroup.objects.select_for_update().get(pk=group.pk)

    if group.next_sequence > 99:
        raise ValueError(
            "El grupo ha alcanzado su capacidad máxima de 99 cámaras."
        )

    sequence = group.next_sequence
    compound_code = f"{group.code}-{sequence:02d}"

    camera = Camera.objects.create(
        group=group,
        compound_code=compound_code,
        name=name,
        description=description,
    )

    group.next_sequence = sequence + 1
    group.save(update_fields=["next_sequence"])

    return camera


def save_camera_image(camera: Camera, file, view_type: str) -> tuple[str, str]:
    """Guarda imagen original + thumbnail. Retorna (original_path, thumb_path).

    Validates format (JPEG/PNG/WebP), max 10 MB, min 640×480.
    Deletes previous image of the same view_type if it exists.
    """
    if view_type not in ("day", "night"):
        raise ValueError("view_type debe ser 'day' o 'night'.")

    # Validate file size first (cheap check)
    if file.size > MAX_FILE_SIZE:
        raise ValueError("El archivo excede 10 MB.")

    # Open with Pillow to validate format and resolution
    img = Image.open(file)
    if img.format not in ALLOWED_FORMATS:
        raise ValueError(
            f"Formato no soportado: {img.format}. Acepta: JPEG, PNG, WebP."
        )
    if img.size[0] < MIN_RESOLUTION[0] or img.size[1] < MIN_RESOLUTION[1]:
        raise ValueError(
            f"Resolución mínima: {MIN_RESOLUTION[0]}x{MIN_RESOLUTION[1]}."
        )

    # Delete previous image of this type if it exists
    delete_camera_image(camera, view_type)

    # Prepare paths
    media_root = _get_media_root()
    group_dir = media_root / camera.group.code
    group_dir.mkdir(parents=True, exist_ok=True)

    ext = img.format.lower()
    if ext == "jpeg":
        ext = "jpg"
    original_name = f"{camera.compound_code}_{view_type}.{ext}"
    thumb_name = f"{camera.compound_code}_{view_type}_thumb.{ext}"

    original_path = group_dir / original_name
    thumb_path = group_dir / thumb_name

    # Save original from uploaded file
    file.seek(0)
    with open(original_path, "wb") as f:
        for chunk in file.chunks():
            f.write(chunk)

    # Generate thumbnail (max 400px width, preserve aspect ratio)
    ratio = THUMBNAIL_MAX_WIDTH / img.size[0]
    if ratio < 1:
        thumb_size = (THUMBNAIL_MAX_WIDTH, int(img.size[1] * ratio))
        thumb = img.resize(thumb_size, Image.LANCZOS)
    else:
        thumb = img.copy()
    thumb.save(str(thumb_path))

    # Update camera model fields (always use forward slashes for portability)
    original_rel = original_path.relative_to(media_root).as_posix()
    thumb_rel = thumb_path.relative_to(media_root).as_posix()

    if view_type == "day":
        camera.day_view_path = original_rel
        camera.day_thumbnail_path = thumb_rel
    else:
        camera.night_view_path = original_rel
        camera.night_thumbnail_path = thumb_rel

    camera.save(update_fields=[
        f"{view_type}_view_path",
        f"{view_type}_thumbnail_path",
    ])

    return original_rel, thumb_rel


def delete_camera_image(camera: Camera, view_type: str) -> None:
    """Remove image and thumbnail from disk, clear model fields."""
    if view_type not in ("day", "night"):
        raise ValueError("view_type debe ser 'day' o 'night'.")

    view_path = getattr(camera, f"{view_type}_view_path")
    thumb_path = getattr(camera, f"{view_type}_thumbnail_path")

    # Delete files from disk if they exist
    media_root = _get_media_root()
    for rel_path in (view_path, thumb_path):
        if rel_path:
            full = media_root / rel_path
            if full.exists():
                full.unlink()

    # Clear model fields
    if view_path or thumb_path:
        setattr(camera, f"{view_type}_view_path", "")
        setattr(camera, f"{view_type}_thumbnail_path", "")
        camera.save(update_fields=[
            f"{view_type}_view_path",
            f"{view_type}_thumbnail_path",
        ])
