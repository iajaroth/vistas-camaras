"""
DeepSeek AI client for camera view analysis.

Uses the OpenAI-compatible SDK pointing to DeepSeek's API endpoint.
"""

import base64
import json
import logging
from pathlib import Path

from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)

ANALYSIS_PROMPT = """Analiza las imágenes de esta cámara de seguridad.
Responde ÚNICAMENTE en JSON con esta estructura exacta:
{
  "pros": ["punto 1", "punto 2", ...],
  "improvements": ["mejora 1", "mejora 2", ...],
  "recommended_analytics": ["analítica 1", "analítica 2", ...],
  "critical_notes": ["nota 1", "nota 2", ...]
}

Reglas:
- En "pros": aspectos positivos de la ubicación y cobertura de la cámara.
- En "improvements": puntos concretos de mejora basados en lo visible.
- En "recommended_analytics": SOLO recomendar analíticas de video aplicables a lo que se VE en la imagen (ej: si hay estacionamiento, recomendar conteo vehicular; si hay zona peatonal, detección de merodeo).
- En "critical_notes": brechas críticas de cobertura, obstrucciones, o puntos ciegos visibles.
- NO incluir recomendaciones genéricas no relacionadas con el contenido de la imagen.
- Si hay dos imágenes (día y noche), comparar diferencias de visibilidad entre ambas condiciones.
"""


def analyze_camera_views(
    day_image_b64: str | None = None, night_image_b64: str | None = None
) -> dict:
    """
    Send camera view image(s) to DeepSeek for analysis.

    Args:
        day_image_b64: Base64-encoded daytime image, or None.
        night_image_b64: Base64-encoded nighttime image, or None.

    Returns:
        Parsed dict with keys: pros, improvements, recommended_analytics, critical_notes.

    Raises:
        ValueError: If no images provided or response cannot be parsed.
        openai.APIError: On API communication failures.
    """
    if not day_image_b64 and not night_image_b64:
        raise ValueError("Se requiere al menos una imagen para el análisis.")

    client = OpenAI(
        api_key=settings.DEEPSEEK_API_KEY,
        base_url=settings.DEEPSEEK_BASE_URL,
    )

    content: list[dict] = [{"type": "text", "text": ANALYSIS_PROMPT}]

    if day_image_b64:
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{day_image_b64}"},
            }
        )
    if night_image_b64:
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{night_image_b64}"},
            }
        )

    response = client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=[{"role": "user", "content": content}],
        timeout=55,
    )

    raw_text = response.choices[0].message.content
    return parse_analysis_response(raw_text)


def parse_analysis_response(raw_text: str) -> dict:
    """
    Extract JSON from DeepSeek response text.

    Handles markdown code blocks (```json ... ```) wrapping.
    Validates the 4 required sections are present and are lists.

    Args:
        raw_text: Raw text content from the AI response.

    Returns:
        Dict with keys: pros, improvements, recommended_analytics, critical_notes.

    Raises:
        ValueError: If JSON cannot be parsed or required sections are missing/invalid.
    """
    text = raw_text.strip()

    # Strip markdown code blocks if present
    if text.startswith("```"):
        # Remove first line (```json or ```) and trailing ```
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"No se pudo parsear la respuesta como JSON: {e}")

    required_keys = {"pros", "improvements", "recommended_analytics", "critical_notes"}
    missing = required_keys - set(data.keys())
    if missing:
        raise ValueError(f"Faltan secciones en la respuesta: {missing}")

    for key in required_keys:
        if not isinstance(data[key], list):
            raise ValueError(f"La sección '{key}' debe ser una lista, recibido: {type(data[key]).__name__}")

    return data


def analyze_with_fallback(camera) -> dict | None:
    """
    High-level helper: reads image files from disk, calls DeepSeek, returns parsed result.

    Args:
        camera: Camera model instance.

    Returns:
        Parsed analysis dict, or None if any error occurs.
    """
    try:
        day_b64 = _read_image_as_b64(camera.day_view_path)
        night_b64 = _read_image_as_b64(camera.night_view_path)

        if not day_b64 and not night_b64:
            logger.warning("Cámara %s no tiene imágenes para analizar.", camera.compound_code)
            return None

        return analyze_camera_views(day_image_b64=day_b64, night_image_b64=night_b64)

    except Exception as e:
        logger.error(
            "Error analizando cámara %s: %s", camera.compound_code, str(e)
        )
        return None


def _read_image_as_b64(relative_path: str) -> str | None:
    """Read an image file from MEDIA_ROOT and return its base64 encoding, or None."""
    if not relative_path:
        return None

    full_path = Path(settings.MEDIA_ROOT) / relative_path
    if not full_path.exists():
        logger.warning("Imagen no encontrada: %s", full_path)
        return None

    return base64.b64encode(full_path.read_bytes()).decode("utf-8")
