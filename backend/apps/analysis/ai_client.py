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

SYSTEM_PROMPT = """Eres un Ingeniero Senior en Seguridad Física, especialista en videovigilancia (CCTV) y analítica de video (VCA). Analizas la imagen de una cámara de seguridad y das un informe HONESTO, CLARO y BREVE.

REGLAS IMPORTANTES:
- Si la cámara está bien posicionada y no tiene problemas reales, DILO así. NO inventes debilidades falsas solo para llenar una sección. Es válido y preferible dejar "improvements" o "critical_notes" como lista vacía si la vista es buena.
- Usa lenguaje simple y directo. Cada punto es una frase corta que cualquier persona no técnica entienda. Evita jerga innecesaria.
- Todo debe basarse en lo que es VISIBLE en la imagen. No supongas nada que no se vea.
- Sé conciso: 1-3 puntos por sección son suficientes. No alargues las listas artificialmente.

Evalúa estos aspectos:

1. CONTEXTO: ¿Qué tipo de zona es y qué cubre la cámara? ¿Hay algún error evidente de instalación (ángulo, obstrucción, reflejo)?

2. PUNTOS A FAVOR: Qué cubre bien la cámara (zonas de paso, accesos, profundidad de campo, buena iluminación).

3. PUNTOS DE MEJORA: SOLO si existen de verdad. Puntos ciegos reales, problemas de luz, vulnerabilidad física. Si no hay ninguno relevante, deja la lista vacía.

4. ANALÍTICAS RECOMENDADAS: Qué analítica de video (cruce de línea, merodeo, conteo, LPR, detección de objetos) tendría sentido aplicar aquí y por qué, basado en lo que se ve.

5. VEREDICTO: Una frase simple — ¿cumple su función esta cámara? Si hace falta una acción, cuál es. Si está bien, dilo sin rodeos.

Responde ÚNICAMENTE en JSON con esta estructura exacta:
{
  "pros": ["punto 1", "punto 2", ...],
  "improvements": ["punto 1", ...] (puede estar vacío),
  "recommended_analytics": ["analítica con ubicación y propósito", ...],
  "critical_notes": ["veredicto final"]
}"""

ANALYSIS_PROMPT = "Analiza esta(s) vista(s) de cámara de seguridad. Si hay dos imágenes, la primera es la vista DIURNA y la segunda es la vista NOCTURNA."


def analyze_camera_views(
    day_image_b64: str | None = None,
    night_image_b64: str | None = None,
    custom_prompt: str | None = None,
) -> dict:
    """Send camera view image(s) to Gemini Flash for analysis."""
    if not day_image_b64 and not night_image_b64:
        raise ValueError("Se requiere al menos una imagen para el análisis.")

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=SYSTEM_PROMPT,
    )

    prompt_text = ANALYSIS_PROMPT
    if custom_prompt:
        prompt_text += f"\n\nContexto adicional proporcionado por el usuario: {custom_prompt.strip()}"

    content = [prompt_text]

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


def analyze_with_fallback(camera, custom_prompt: str | None = None) -> dict | None:
    """High-level helper: reads image files from disk, calls Gemini, returns parsed result."""
    try:
        day_b64 = _read_image_as_b64(camera.day_view_path)
        night_b64 = _read_image_as_b64(camera.night_view_path)

        if not day_b64 and not night_b64:
            logger.warning("Cámara %s no tiene imágenes para analizar.", camera.compound_code)
            return None

        return analyze_camera_views(
            day_image_b64=day_b64, night_image_b64=night_b64, custom_prompt=custom_prompt
        )

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
