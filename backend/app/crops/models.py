"""Server-owned crop-health records.

Photos are deliberately not stored here.  A diagnosis retains only the
farmer-approved result and the calendar stores only the event details that the
farmer chose to keep.
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.auth.models import AuthBase


class FarmCalendarEvent(AuthBase):
    __tablename__ = "shetimitra_farm_calendar_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("sahayak_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(24), nullable=False, default="personal")
    crop: Mapped[str | None] = mapped_column(String(80))
    origin: Mapped[str] = mapped_column(String(24), nullable=False, default="manual")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class CropDiagnosisRecord(AuthBase):
    """A compact history entry; uploaded pixels are never persisted."""

    __tablename__ = "shetimitra_crop_diagnoses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("sahayak_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    crop: Mapped[str] = mapped_column(String(80), nullable=False)
    growth_stage: Mapped[str] = mapped_column(String(80), nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[str] = mapped_column(String(24), nullable=False)
    result: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
