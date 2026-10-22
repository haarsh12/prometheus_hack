"""CropVision resilient-result contract coverage."""

from __future__ import annotations

from app.crops.contracts import CropDiagnosisResult
from app.services import gemini


def test_crop_vision_normalizes_safe_format_variation() -> None:
    result = CropDiagnosisResult.model_validate(
        gemini._normalized_crop_payload(
            {
                "category": "disease",
                "severity": "medium",
                "confidence": 82,
                "boxes": [{"label": "brown spot", "x": 120.4, "y": 90.6, "width": 950, "height": 18}],
                "treatment": [{"title": "Inspect", "detail": "Check nearby leaves.", "timing": "Today", "kind": "cultural"}],
            }
        )
    )

    assert result.category == "fungal"
    assert result.severity == "Moderate"
    assert result.confidence == 0.82
    assert result.boxes[0].width == 880
    assert result.treatment[0].kind == "field"


def test_crop_vision_accepts_a_json_code_fence_from_a_compatible_model() -> None:
    payload = gemini._parse_crop_json("```json\n{\"label\": \"visible leaf spot\"}\n```")

    assert payload == {"label": "visible leaf spot"}
