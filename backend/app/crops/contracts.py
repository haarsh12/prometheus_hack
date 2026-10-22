"""Strict, bounded public contracts for crop diagnosis and farm planning."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class SymptomBox(BaseModel):
    """A visual region normalized to a 1000 by 1000 image coordinate space."""

    label: str = Field(min_length=1, max_length=80)
    x: int = Field(ge=0, le=1000)
    y: int = Field(ge=0, le=1000)
    width: int = Field(ge=1, le=1000)
    height: int = Field(ge=1, le=1000)


class TreatmentStep(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    detail: str = Field(min_length=1, max_length=600)
    timing: str = Field(min_length=1, max_length=100)
    kind: Literal["observe", "bio", "spray", "field"] = "observe"


class CropDiagnosisResult(BaseModel):
    label: str = Field(min_length=1, max_length=160)
    category: Literal["healthy", "fungal", "pest", "nutrient", "water", "unknown"]
    confidence: float = Field(ge=0, le=1)
    severity: Literal["Low", "Moderate", "High"]
    summary: str = Field(min_length=1, max_length=900)
    observations: list[str] = Field(default_factory=list, max_length=6)
    boxes: list[SymptomBox] = Field(default_factory=list, max_length=8)
    affected_leaf_area_percent: float | None = Field(default=None, ge=0, le=100)
    treatment: list[TreatmentStep] = Field(default_factory=list, min_length=1, max_length=5)
    followup_days: int = Field(ge=1, le=21)
    caution: str = Field(min_length=1, max_length=500)


class CropDiagnosisResponse(CropDiagnosisResult):
    id: str
    crop: str
    growth_stage: str
    captured_at: datetime
    model_name: str = "Gemini Vision"
    saved: bool = False


class FarmCalendarEventCreate(BaseModel):
    event_date: date
    title: str = Field(min_length=1, max_length=160)
    detail: str | None = Field(default=None, max_length=1000)
    kind: Literal["personal", "treatment", "check", "weather"] = "personal"
    crop: str | None = Field(default=None, max_length=80)
    origin: Literal["manual", "diagnosis"] = "manual"


class FarmCalendarEventResponse(BaseModel):
    id: str
    date: date
    title: str
    detail: str | None = None
    kind: Literal["personal", "treatment", "check", "weather"]
    crop: str | None = None
    origin: Literal["manual", "diagnosis"]
    created_at: datetime
