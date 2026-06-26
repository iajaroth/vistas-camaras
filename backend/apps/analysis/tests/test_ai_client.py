"""Tests for the DeepSeek AI client parse logic."""

import pytest

from apps.analysis.ai_client import parse_analysis_response


class TestParseAnalysisResponse:
    """Unit tests for parse_analysis_response."""

    def test_valid_json(self):
        raw = '{"pros": ["a"], "improvements": ["b"], "recommended_analytics": ["c"], "critical_notes": ["d"]}'
        result = parse_analysis_response(raw)
        assert result == {
            "pros": ["a"],
            "improvements": ["b"],
            "recommended_analytics": ["c"],
            "critical_notes": ["d"],
        }

    def test_strips_markdown_code_block(self):
        raw = '```json\n{"pros": [], "improvements": [], "recommended_analytics": [], "critical_notes": []}\n```'
        result = parse_analysis_response(raw)
        assert result == {
            "pros": [],
            "improvements": [],
            "recommended_analytics": [],
            "critical_notes": [],
        }

    def test_strips_markdown_code_block_no_language(self):
        raw = '```\n{"pros": ["x"], "improvements": [], "recommended_analytics": [], "critical_notes": []}\n```'
        result = parse_analysis_response(raw)
        assert result["pros"] == ["x"]

    def test_missing_section_raises(self):
        raw = '{"pros": [], "improvements": []}'
        with pytest.raises(ValueError, match="Faltan secciones"):
            parse_analysis_response(raw)

    def test_section_not_list_raises(self):
        raw = '{"pros": "not a list", "improvements": [], "recommended_analytics": [], "critical_notes": []}'
        with pytest.raises(ValueError, match="debe ser una lista"):
            parse_analysis_response(raw)

    def test_invalid_json_raises(self):
        raw = "this is not json at all"
        with pytest.raises(ValueError, match="No se pudo parsear"):
            parse_analysis_response(raw)

    def test_whitespace_around_response(self):
        raw = '  \n  {"pros": ["a"], "improvements": ["b"], "recommended_analytics": ["c"], "critical_notes": ["d"]}  \n  '
        result = parse_analysis_response(raw)
        assert result["pros"] == ["a"]
