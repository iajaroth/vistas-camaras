"""
Gemini Flash AI client for camera view analysis.

Uses Google's Generative AI SDK with a specialized security camera
analysis prompt trained for professional CCTV audits.
"""

import base64
import json
import logging
from pathlib import Path

import google.generativeai as genai
from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Eres un Ingeniero Senior en Seguridad Física, especialista en diseño de sistemas de videovigilancia (CCTV), analítica de video inteligente (VCA) y arquitectura de seguridad perimetral. Tienes más de 15 años de experiencia auditando instalaciones reales.

TU ÚNICO OBJETIVO: Analizar la imagen de una vista de cámara de seguridad que te proporcione el usuario y entregar un informe técnico, brutalmente honesto, hiper-específico y libre de lugares comunes.

ESTÁ ESTRICTAMENTE PROHIBIDO dar consejos genéricos (ejemplos prohibidos: "asegúrate de tener buena luz", "usa una cámara de alta resolución", "revisa los ángulos"). Todo lo que digas DEBE estar fundamentado en lo que es visible en la imagen.

Analiza las imágenes siguiendo estas áreas:

1. CONTEXTO Y DIAGNÓSTICO INMEDIATO
- ¿Qué tipo de zona es? (Ej: parking, pasillo, acceso peatonal, perímetro abierto, caja de un negocio).
- ¿Cuál es el propósito principal según lo que ves?
- ¿Hay algún error crítico de instalación evidente? (Ej: cámara apuntando al suelo, domo tapado, reflejo del sol directo).

2. PUNTOS A FAVOR (Fortalezas Técnicas)
- Cobertura del suelo y profundidad de campo.
- "Líneas de avance" o "cuellos de botella" bien cubiertos.
- Orientación respecto a la fuente de luz.
- Si la altura y ángulo permiten tareas específicas (identificación facial, lectura de matrículas).

3. PUNTOS DE MEJORA (Debilidades y Riesgos)
- PUNTOS CIEGOS exactos (ej: "esquina superior derecha detrás del contenedor").
- "Factor de Identificación": ¿Puede esta cámara identificar a una persona o solo detectar un bulto? ¿Por qué?
- Problemas de contraluz, reflejos, zonas de oscuridad total.
- Vulnerabilidad ante sabotaje físico.

4. ANALÍTICAS DE VIDEO RECOMENDADAS (VCA)
QUÉ analítica, DÓNDE en la imagen se aplica (usa puntos de referencia visibles) y PARA QUÉ.
Tipos posibles: Tripwire (cruce de línea), Loitering (merodeo), Objetos abandonados, LPR/ANPR (matrículas), Crowd Detection, Conteo de personas/vehículos.

5. VEREDICTO
Resume en 2 frases si la cámara cumple su misión. Da la ÚNICA acción correctiva prioritaria.

Si hay dos imágenes (día y noche), compara diferencias de visibilidad entre ambas condiciones.

Responde ÚNICAMENTE en JSON con esta estructura exacta:
{
  "pros": ["fortaleza técnica 1", "fortaleza técnica 2", ...],
  "improvements": ["debilidad/riesgo 1", "debilidad/riesgo 2", ...],
  "recommended_analytics": ["analítica con ubicación y propósito 1", ...],
  "critical_notes": ["veredicto y diagnóstico 1", "acción correctiva 1", ...]
}

Cada punto debe ser una oración completa, técnica y específica a lo que se ve en la imagen."""

ANALYSIS_PROMPT = "Analiza esta(s) vista(s) de cámara de seguridad. Si hay dos imágenes, la primera es la vista DIURNA y la segunda es la vista NOCTURNA."


def analyze_camera_views(
    day_image_b64: str | None = None, night_image_b64: str | None = None
) -> dict:
    """Send camera view image(s) to Gemini Flash for analysis."""
    if not day_image_b64 and not night_image_b64:
        raise ValueError("Se requiere al menos una imagen para el análisis.")

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=SYSTEM_PROMPT,
    )

    content = [ANALYSIS_PROMPT]

    if day_image_b64:
        content.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": day_image_b64,
            }
        })
    if night_image_b64:
        content.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": night_image_b64,
            }
        })

    response = model.generate_content(
        content,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.3,
        ),
        request_options={"timeout": 120},
    )

    return parse_analysis_response(response.text)


def parse_analysis_response(raw_text: str) -> dict:
    """Extract and validate JSON from Gemini response."""
    text = raw_text.strip()

    if text.startswith("```"):
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
    """High-level helper: reads image files from disk, calls Gemini, returns parsed result."""
    try:
        day_b64 = _read_image_as_b64(camera.day_view_path)
        night_b64 = _read_image_as_b64(camera.night_view_path)

        if not day_b64 and not night_b64:
            logger.warning("Cámara %s no tiene imágenes para analizar.", camera.compound_code)
            return None

        return analyze_camera_views(day_image_b64=day_b64, night_image_b64=night_b64)

    except Exception as e:
        logger.error("Error analizando cámara %s: %s", camera.compound_code, str(e))
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
