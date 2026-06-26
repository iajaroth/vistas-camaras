"""PDF and Excel export generators for camera groups and individual cameras."""

import os
from io import BytesIO
from pathlib import Path

from django.conf import settings
from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    Image as RLImage,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

# PDF image dimensions (points ≈ 400x300 at 72dpi)
PDF_IMG_WIDTH = 400
PDF_IMG_HEIGHT = 300


def _get_media_root() -> Path:
    return Path(settings.MEDIA_ROOT)


# ---------------------------------------------------------------------------
# PDF exports
# ---------------------------------------------------------------------------


def _build_camera_elements(camera, styles) -> list:
    """Build ReportLab flowable elements for a single camera."""
    elements: list = []
    heading = styles["Heading2"]
    body = styles["BodyText"]

    elements.append(Paragraph(f"Cámara: {camera.compound_code} – {camera.name}", heading))
    elements.append(Spacer(1, 6))

    # Day and night images
    for view_type, label in [("day", "Vista Diurna"), ("night", "Vista Nocturna")]:
        elements.append(Paragraph(f"<b>{label}</b>", body))
        rel_path = getattr(camera, f"{view_type}_view_path", "")
        if rel_path:
            full_path = os.path.join(str(_get_media_root()), rel_path)
            if os.path.isfile(full_path):
                elements.append(
                    RLImage(full_path, width=PDF_IMG_WIDTH, height=PDF_IMG_HEIGHT)
                )
            else:
                elements.append(Paragraph("[Imagen no disponible]", body))
        else:
            elements.append(Paragraph("[Imagen no disponible]", body))
        elements.append(Spacer(1, 6))

    # AI report
    report = None
    try:
        report = camera.report
    except Exception:
        pass

    if report:
        sections = [
            ("pros", "Puntos a Favor"),
            ("improvements", "Puntos de Mejora"),
            ("recommended_analytics", "Analíticas Recomendadas"),
            ("critical_notes", "Notas Críticas (IA)"),
        ]
        for field, title in sections:
            items = getattr(report, field, None) or []
            if items:
                elements.append(Paragraph(f"<b>{title}</b>", body))
                for item in items:
                    elements.append(Paragraph(f"• {item}", body))
                elements.append(Spacer(1, 4))

    # Manual critical notes
    notes = camera.notes.all()
    if notes.exists():
        elements.append(Paragraph("<b>Notas Críticas (Manual)</b>", body))
        for note in notes:
            elements.append(
                Paragraph(
                    f"• [{note.created_at:%Y-%m-%d}] {note.content}",
                    body,
                )
            )
        elements.append(Spacer(1, 4))

    elements.append(Spacer(1, 20))
    return elements


def export_group_pdf(group) -> BytesIO:
    """Generate a PDF for all cameras in a group. Returns a BytesIO buffer."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements: list = []

    # Title
    elements.append(Paragraph(f"Grupo: {group.code} – {group.name}", styles["Heading1"]))
    if group.description:
        elements.append(Paragraph(group.description, styles["BodyText"]))
    elements.append(Spacer(1, 12))

    cameras = group.cameras.select_related("report").prefetch_related("notes").all()
    for camera in cameras:
        elements.extend(_build_camera_elements(camera, styles))

    if not elements:
        elements.append(Paragraph("No hay cámaras en este grupo.", styles["BodyText"]))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def export_camera_pdf(camera) -> BytesIO:
    """Generate a PDF for a single camera. Returns a BytesIO buffer."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements: list = []

    elements.append(
        Paragraph(f"Grupo: {camera.group.code} – {camera.group.name}", styles["Heading1"])
    )
    elements.append(Spacer(1, 8))
    elements.extend(_build_camera_elements(camera, styles))

    doc.build(elements)
    buffer.seek(0)
    return buffer


# ---------------------------------------------------------------------------
# Excel exports
# ---------------------------------------------------------------------------


def export_group_excel(group) -> BytesIO:
    """Generate an XLSX workbook with all cameras in a group."""
    wb = Workbook()
    ws = wb.active
    ws.title = f"Grupo {group.code}"

    headers = [
        "Código",
        "Nombre",
        "Vista Día",
        "Vista Noche",
        "Pros",
        "Mejoras",
        "Analíticas",
        "Notas Críticas",
        "Estado",
    ]
    ws.append(headers)

    for camera in group.cameras.select_related("report").prefetch_related("notes").all():
        _append_camera_row(ws, camera)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer


def export_camera_excel(camera) -> BytesIO:
    """Generate an XLSX workbook for a single camera."""
    wb = Workbook()
    ws = wb.active
    ws.title = camera.compound_code

    headers = [
        "Código",
        "Nombre",
        "Vista Día",
        "Vista Noche",
        "Pros",
        "Mejoras",
        "Analíticas",
        "Notas Críticas",
        "Estado",
    ]
    ws.append(headers)
    _append_camera_row(ws, camera)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer


def _append_camera_row(ws, camera) -> None:
    """Append a single camera's data as a row to the worksheet."""
    has_report = hasattr(camera, "report") and camera.report is not None

    # ponytail: try attribute access; OneToOne may raise DoesNotExist
    try:
        report = camera.report
    except Exception:
        report = None
        has_report = False

    row = [
        camera.compound_code,
        camera.name,
        "Sí" if camera.day_view_path else "No",
        "Sí" if camera.night_view_path else "No",
        "; ".join(report.pros) if has_report else "",
        "; ".join(report.improvements) if has_report else "",
        "; ".join(report.recommended_analytics) if has_report else "",
        "; ".join(n.content for n in camera.notes.all()) if camera.pk else "",
        "Analizada" if has_report else "Pendiente",
    ]
    ws.append(row)
